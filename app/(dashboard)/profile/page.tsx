import type { Metadata } from "next";
import { ProfileContent } from "./ProfileContent";

export const metadata: Metadata = {
    title: "Profile & Settings",
};

export default function ProfilePage() {
    return <ProfileContent />;
}
