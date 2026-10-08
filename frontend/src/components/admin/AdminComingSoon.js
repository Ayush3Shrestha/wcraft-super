import { Link } from "react-router-dom";
import { Construction } from "lucide-react";

// Placeholder for admin sections that aren't built yet, so links from the
// dashboard land somewhere instead of a blank page.
export default function AdminComingSoon() {
  return (
    <div className="flex items-center justify-center py-24 px-4">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
          <Construction className="h-7 w-7 text-orange-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Coming soon</h1>
        <p className="text-gray-600 mb-6">This section of the admin panel hasn't been built yet.</p>
        <Link to="/admin/dashboard" className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
