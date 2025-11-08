import { redirect } from "next/navigation";

export default function AdminPage() {
  // Redirect /admin to /admin/overview
  redirect("/admin/overview");
}

