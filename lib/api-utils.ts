import { NextRequest } from "next/server";
import { getServerSession } from "./auth";

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const userIdHeader = request.headers.get("x-user-id");
  
  if (userIdHeader) {
    return userIdHeader;
  }

  const session = await getServerSession();
  return session?.user?.id || null;
}

export async function requireUserId(request: NextRequest): Promise<string> {
  const userId = await getUserIdFromRequest(request);
  
  if (!userId) {
    throw new Error("Unauthorized: User ID not found");
  }
  
  return userId;
}
