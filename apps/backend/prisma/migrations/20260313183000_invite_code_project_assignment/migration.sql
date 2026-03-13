CREATE TYPE "InviteCodeProjectAssignmentMode" AS ENUM ('NONE', 'ALL', 'SELECTED');

ALTER TABLE "TenantInviteCode"
ADD COLUMN "projectAssignmentMode" "InviteCodeProjectAssignmentMode" NOT NULL DEFAULT 'NONE';

CREATE TABLE "_ProjectToTenantInviteCode" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectToTenantInviteCode_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_ProjectToTenantInviteCode_B_index" ON "_ProjectToTenantInviteCode"("B");

ALTER TABLE "_ProjectToTenantInviteCode"
ADD CONSTRAINT "_ProjectToTenantInviteCode_A_fkey"
FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ProjectToTenantInviteCode"
ADD CONSTRAINT "_ProjectToTenantInviteCode_B_fkey"
FOREIGN KEY ("B") REFERENCES "TenantInviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;