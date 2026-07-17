import { Suspense } from "react";
import { SearchScreen } from "@/components/mk/SearchScreen";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mk-shell" style={{ padding: "40px 0" }}>
          <p className="mk-block__note">Loading…</p>
        </div>
      }
    >
      <SearchScreen />
    </Suspense>
  );
}
