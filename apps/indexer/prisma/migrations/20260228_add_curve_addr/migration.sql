-- Story 4.2: Store bonding curve and token addresses on ideas
ALTER TABLE "Idea" ADD COLUMN "curveAddr" TEXT;
ALTER TABLE "Idea" ADD COLUMN "tokenAddr" TEXT;
