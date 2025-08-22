import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

type Handler = (req: any, res: any) => Promise<void>;

function jsonResponse(data: any, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
  } as any;
}

function createReqRes(query: Record<string, any> = {}) {
  const req: any = { query };
  const state: any = { statusCode: 0, body: undefined };
  const res: any = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: any) {
      state.body = payload;
      return this;
    },
  };
  return { req, res, get: () => state };
}

async function loadHandler(): Promise<Handler> {
  jest.resetModules();
  process.env.STEAM_API_KEY = "test_key";
  process.env.STEAM_ID64 = "12345678901234567";
  const mod = await import("../suggest-game");
  return mod.default as Handler;
}

beforeEach(() => {
  jest.restoreAllMocks();
});

afterEach(() => {
  // cleanup fetch mock
  // @ts-ignore
  delete (global as any).fetch;
  jest.restoreAllMocks();
});

describe("suggest-game API", () => {
  it("returns a suggestion from least played when no filter", async () => {
    const handler = await loadHandler();

    const games = [
      { appid: 1, name: "A", playtime_forever: 50 },
      { appid: 2, name: "B", playtime_forever: 0 },
      { appid: 3, name: "C", playtime_forever: 10 },
    ];

    const fetchMock: jest.Mock = jest.fn().mockImplementation((url: unknown) => {
      const href = String(url);
      if (href.includes("GetOwnedGames")) {
        return Promise.resolve(jsonResponse({ response: { games, game_count: games.length } }));
      }
      throw new Error("Unexpected fetch: " + href);
    });
    // @ts-ignore
    global.fetch = fetchMock;

    // Freeze randomness to pick first in sorted list (B)
  jest.spyOn(Math, "random").mockReturnValue(0);

    const { req, res, get } = createReqRes();
    await handler(req, res);
    const { statusCode, body } = get();

    expect(statusCode).toBe(200);
    expect(body?.suggestion?.appid).toBe(2); // least played after sort
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("applies OS filter using appdetails platforms", async () => {
    const handler = await loadHandler();
    const games = [
      { appid: 10, name: "X", playtime_forever: 0 },
      { appid: 20, name: "Y", playtime_forever: 1 },
      { appid: 30, name: "Z", playtime_forever: 2 },
    ];
    const fetchMock: jest.Mock = jest.fn().mockImplementation((url: unknown) => {
      const href = String(url);
      if (href.includes("GetOwnedGames")) {
        return Promise.resolve(jsonResponse({ response: { games } }));
      }
      const id = /appdetails\?appids=(\d+)/.exec(href)?.[1];
      const appid = Number(id);
      const platforms = {
        10: { linux: true },
        20: { linux: false },
        30: { linux: true },
      } as any;
      return Promise.resolve(jsonResponse({
        [String(appid)]: { success: true, data: { platforms: platforms[appid] || {} } },
      }));
    });
    // @ts-ignore
    global.fetch = fetchMock;
  jest.spyOn(Math, "random").mockReturnValue(0);

    const { req, res, get } = createReqRes({ os: "linux" });
    await handler(req, res);
    const { statusCode, body } = get();
    expect(statusCode).toBe(200);
    expect(body.filteredByOs).toBe(true);
    expect([10, 30]).toContain(body.suggestion.appid);
  });

  it("checks basic RAM/CPU/GPU/Storage requirements when provided", async () => {
    const handler = await loadHandler();
    const games = [
      { appid: 42, name: "Linux OK", playtime_forever: 0 },
      { appid: 43, name: "Other", playtime_forever: 1 },
    ];
    const fetchMock: jest.Mock = jest.fn().mockImplementation((url: unknown) => {
      const href = String(url);
      if (href.includes("GetOwnedGames")) {
        return Promise.resolve(jsonResponse({ response: { games } }));
      }
      const id = /appdetails\?appids=(\d+)/.exec(href)?.[1];
      const appid = Number(id);
      if (appid === 42) {
        return Promise.resolve(jsonResponse({
          "42": {
            success: true,
            data: {
              platforms: { linux: true },
              linux_requirements: {
                minimum: "<strong>Minimum:</strong><br>Memory: 8 GB RAM<br>Graphics: 2 GB VRAM<br>Storage: 40 GB available space<br>Processor: Quad-core 3.0 GHz",
              },
            },
          },
        }));
      }
  return Promise.resolve(jsonResponse({
        [String(appid)]: { success: true, data: { platforms: { linux: false } } },
      }));
    });
    // @ts-ignore
    global.fetch = fetchMock;
  jest.spyOn(Math, "random").mockReturnValue(0);

    const { req, res, get } = createReqRes({ os: "linux", ramGB: "16", cores: "8", cpuGHz: "3.2", gpuVendor: "intel", vramGB: "2", storageGB: "80" });
    await handler(req, res);
    const { statusCode, body } = get();
    expect(statusCode).toBe(200);
    expect(body.requirementsChecked).toBe(true);
    expect(body.suggestion.appid).toBe(42);
  });

  it("returns 404 when no games found", async () => {
    const handler = await loadHandler();
  const fetchMock: jest.Mock = jest.fn((_url: unknown) => Promise.resolve(jsonResponse({ response: { games: [] } })));
    // @ts-ignore
    global.fetch = fetchMock;
    const { req, res, get } = createReqRes();
    await handler(req, res);
    const { statusCode } = get();
    expect(statusCode).toBe(404);
  });
});
