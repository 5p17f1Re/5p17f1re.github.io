import { describe, expect, it } from "vitest";
import { parseQueueCancelCommand, parseUnpublishCommand } from "../publisher-worker/src/commands";

describe("photo publisher commands", () => {
  it("parses numbered queue cancellation with the canonical slash form", () => {
    expect(parseQueueCancelCommand("/1 2 5 cancel")).toEqual([1, 2, 5]);
  });

  it("parses published-photo removal selections", () => {
    expect(parseUnpublishCommand("/unpublish 3")).toEqual([3]);
    expect(parseUnpublishCommand("/unpublish 1 2 3")).toEqual([1, 2, 3]);
    expect(parseUnpublishCommand("/unpublish all")).toBeUndefined();
  });
});
