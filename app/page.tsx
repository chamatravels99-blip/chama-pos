import { redirect } from "next/navigation";

export default function HomePage() {
  // Direct access routes straight to dashboard foundation
  redirect("/dashboard");
}
