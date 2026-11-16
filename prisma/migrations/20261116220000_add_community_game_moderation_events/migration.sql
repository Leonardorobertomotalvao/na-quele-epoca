-- Audit trail for community game moderation. Existing submission rows are unchanged.
CREATE TABLE "community_game_moderation_event" (
    "id" TEXT NOT NULL,
    "communityGameId" TEXT,
    "gameName" TEXT NOT NULL,
    "moderatorId" TEXT,
    "moderatorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_game_moderation_event_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "community_game_moderation_event_communityGameId_createdAt_idx" ON "community_game_moderation_event"("communityGameId", "createdAt");
CREATE INDEX "community_game_moderation_event_moderatorId_createdAt_idx" ON "community_game_moderation_event"("moderatorId", "createdAt");
ALTER TABLE "community_game_moderation_event" ADD CONSTRAINT "community_game_moderation_event_communityGameId_fkey" FOREIGN KEY ("communityGameId") REFERENCES "community_game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "community_game_moderation_event" ADD CONSTRAINT "community_game_moderation_event_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
