// Auto-sourced from apps/contracts/out after `forge build`.
// Do not edit by hand — regenerate if contracts change.

export const IDEA_REGISTRY_ABI = [
  { type: "constructor", inputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "VOTING_WINDOW", inputs: [], outputs: [{ name: "", type: "uint64" }], stateMutability: "view" },
  { type: "function", name: "accumulateVote", inputs: [{ name: "ideaId", type: "uint256" }, { name: "isYes", type: "bool" }, { name: "weight", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getIdea", inputs: [{ name: "ideaId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "id", type: "uint256" }, { name: "titleHash", type: "bytes32" }, { name: "founder", type: "address" }, { name: "publishedAt", type: "uint64" }, { name: "closesAt", type: "uint64" }, { name: "status", type: "uint8" }, { name: "yesWeight", type: "uint256" }, { name: "noWeight", type: "uint256" }, { name: "pmfScore", type: "uint32" }] }], stateMutability: "view" },
  { type: "function", name: "ideaCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "isVotingOpen", inputs: [{ name: "ideaId", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "registerIdea", inputs: [{ name: "titleHash", type: "bytes32" }], outputs: [{ name: "ideaId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "renounceOwnership", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "resolveIdea", inputs: [{ name: "ideaId", type: "uint256" }, { name: "won", type: "bool" }, { name: "pmfScore", type: "uint32" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setVotingEngine", inputs: [{ name: "_votingEngine", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "transferOwnership", inputs: [{ name: "newOwner", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "votingEngine", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "event", name: "IdeaRegistered", inputs: [{ name: "ideaId", type: "uint256", indexed: true }, { name: "founder", type: "address", indexed: true }, { name: "titleHash", type: "bytes32", indexed: false }, { name: "closesAt", type: "uint64", indexed: false }], anonymous: false },
  { type: "event", name: "IdeaResolved",   inputs: [{ name: "ideaId", type: "uint256", indexed: true }, { name: "won", type: "bool", indexed: false }, { name: "pmfScore", type: "uint32", indexed: false }], anonymous: false },
  { type: "event", name: "OwnershipTransferred", inputs: [{ name: "previousOwner", type: "address", indexed: true }, { name: "newOwner", type: "address", indexed: true }], anonymous: false },
  { type: "event", name: "VotingEngineSet", inputs: [{ name: "votingEngine", type: "address", indexed: true }], anonymous: false },
  { type: "error", name: "IdeaDoesNotExist", inputs: [] },
  { type: "error", name: "IdeaNotActive",    inputs: [] },
  { type: "error", name: "NotVotingEngine",  inputs: [] },
  { type: "error", name: "VotingClosed",     inputs: [] },
  { type: "error", name: "OwnableInvalidOwner",         inputs: [{ name: "owner", type: "address" }] },
  { type: "error", name: "OwnableUnauthorizedAccount",  inputs: [{ name: "account", type: "address" }] },
] as const

export const VOTING_ENGINE_ABI = [
  { type: "constructor", inputs: [{ name: "_registry", type: "address" }], stateMutability: "nonpayable" },
  { type: "function", name: "MULTIPLIER_EARLY", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "MULTIPLIER_LATE",  inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "MULTIPLIER_MID",   inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "SCALE",            inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "castVote", inputs: [{ name: "ideaId", type: "uint256" }, { name: "direction", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "computeWeightAndTier", inputs: [{ name: "elapsedSeconds", type: "uint64" }], outputs: [{ name: "weight", type: "uint256" }, { name: "tier", type: "uint8" }], stateMutability: "pure" },
  { type: "function", name: "getVoteRecord", inputs: [{ name: "ideaId", type: "uint256" }, { name: "voter", type: "address" }], outputs: [{ name: "", type: "tuple", components: [{ name: "hasVoted", type: "bool" }, { name: "direction", type: "bool" }, { name: "weight", type: "uint256" }, { name: "tier", type: "uint8" }, { name: "castedAt", type: "uint64" }] }], stateMutability: "view" },
  { type: "function", name: "registry", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "event", name: "VoteCast", inputs: [{ name: "ideaId", type: "uint256", indexed: true }, { name: "voter", type: "address", indexed: true }, { name: "direction", type: "bool", indexed: false }, { name: "weight", type: "uint256", indexed: false }, { name: "tier", type: "uint8", indexed: false }], anonymous: false },
  { type: "error", name: "AlreadyVoted",   inputs: [] },
  { type: "error", name: "IdeaNotActive",  inputs: [] },
  { type: "error", name: "VotingClosed",   inputs: [] },
] as const
