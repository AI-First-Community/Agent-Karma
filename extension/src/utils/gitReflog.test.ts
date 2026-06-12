import { describe, it, expect } from "vitest";
import { latestCommitSha, parseGitdirPointer } from "./gitReflog";

const TS = "Jane Doe <jane@example.com> 1700000000 +0000";

describe("latestCommitSha", () => {
  it("returns the short sha of a commit entry", () => {
    const log = `0000000000000000000000000000000000000000 abcdef1234567890abcdef1234567890abcdef12 ${TS}\tcommit (initial): first`;
    expect(latestCommitSha(log)).toBe("abcdef1234");
  });

  it("handles commit and commit (amend)", () => {
    expect(latestCommitSha(`oldsha 1111111111111111111111111111111111111111 ${TS}\tcommit: add feature`)).toBe("1111111111");
    expect(latestCommitSha(`oldsha 2222222222222222222222222222222222222222 ${TS}\tcommit (amend): reword`)).toBe("2222222222");
  });

  it("uses the LAST line when there are many entries", () => {
    const log = [
      `0000 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ${TS}\tcommit (initial): a`,
      `aaaa bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb ${TS}\tcheckout: moving`,
      `bbbb cccccccccccccccccccccccccccccccccccccccc ${TS}\tcommit: c`,
    ].join("\n");
    expect(latestCommitSha(log)).toBe("cccccccccc");
  });

  it("returns null for non-commit entries (checkout/merge/reset/pull)", () => {
    expect(latestCommitSha(`a b ${TS}\tcheckout: moving from main to dev`)).toBeNull();
    expect(latestCommitSha(`a b ${TS}\tmerge feature: Fast-forward`)).toBeNull();
    expect(latestCommitSha(`a b ${TS}\treset: moving to HEAD~1`)).toBeNull();
    expect(latestCommitSha(`a b ${TS}\tpull: Fast-forward`)).toBeNull();
  });

  it("returns null for empty or malformed content", () => {
    expect(latestCommitSha("")).toBeNull();
    expect(latestCommitSha("   \n  ")).toBeNull();
    expect(latestCommitSha("no-tab-here commit")).toBeNull();
  });

  it("accepts 64-char SHA-256 object ids (git's newer hash format)", () => {
    const sha256 = "a".repeat(64);
    expect(latestCommitSha(`old ${sha256} ${TS}\tcommit: sha256 repo`)).toBe("aaaaaaaaaa");
  });
});

describe("parseGitdirPointer", () => {
  it("extracts the path from a `.git` pointer file", () => {
    expect(parseGitdirPointer("gitdir: ../.git/worktrees/feature\n")).toBe("../.git/worktrees/feature");
    expect(parseGitdirPointer("gitdir: /abs/path/.git/modules/sub")).toBe("/abs/path/.git/modules/sub");
  });
  it("returns null when there is no gitdir line", () => {
    expect(parseGitdirPointer("")).toBeNull();
    expect(parseGitdirPointer("ref: refs/heads/main")).toBeNull();
  });
});
