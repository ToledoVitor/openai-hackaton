/** Cloudflare Worker entry point for the App Router deployment. */
import {
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
  handleImageOptimization,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { createPaidRouteRateLimitGuard } from "../src/server/guardrails";

interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{
          response(): Response;
        }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const guardPaidRoute = createPaidRouteRateLimitGuard();

function fetchLocalAsset(request: Request, assetPath: string, assets: AssetFetcher): Promise<Response> {
  const assetUrl = new URL(assetPath, request.url);
  const requestUrl = new URL(request.url);

  // The image optimizer only needs static, same-origin files. Never let its
  // `url` parameter turn the ASSETS binding into a remote or cross-origin proxy.
  if (assetUrl.origin !== requestUrl.origin) {
    return Promise.resolve(new Response("Invalid image source", { status: 400 }));
  }

  return assets.fetch(new Request(assetUrl));
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const limitedResponse = guardPaidRoute(request);
    if (limitedResponse !== undefined) {
      return limitedResponse;
    }

    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image" || url.pathname === "/_next/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];

      return handleImageOptimization(
        request,
        {
          fetchAsset: (path) => fetchLocalAsset(request, path, env.ASSETS),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality });

            return result.response();
          },
        },
        allowedWidths,
      );
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
