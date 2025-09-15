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
  const mod = await import("../pages/api/suggest-game");
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
        return jsonResponse({ response: { games } });
      }
      return jsonResponse({});
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const { req, res, get } = createReqRes();
    await handler(req, res);
    const state = get();
    expect(state.statusCode).toBe(200);
    expect(state.body.suggestion.name).toBe("B");
  });
});
