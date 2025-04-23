import { useNavigate } from "react-router";
import { useAuth } from "~/context/auth-context";
import ATS_IMG from "./ats.png";

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-[#0e1a2b] text-white flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col">
        {/* Header */}
        <header className="py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">YTFCS</h1>
            <p className="text-blue-300 text-sm">Applicant Tracking System</p>
          </div>

          {!loading && !user && (
            <div className="flex items-center">
              <button
                onClick={() => navigate("/auth/login")}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Sign In
              </button>
            </div>
          )}

          {!loading && user && (
            <div className="flex items-center">
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Dashboard
              </button>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="py-10 flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl font-bold mb-6 leading-tight">
                Applicant Tracking System
              </h2>
              <p className="text-xl text-blue-200 mb-8 leading-relaxed">
                A web based platform to manage the recruitment process. Track
                candidates, coordinate interviews, and collaborate with the
                hiring team—all in one secure platform.
              </p>

              {!loading && !user && (
                <button
                  onClick={() => navigate("/auth/login")}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg transition-colors text-lg font-medium shadow-lg shadow-blue-500/20"
                >
                  Access Platform
                </button>
              )}

              {!loading && user && (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg transition-colors text-lg font-medium shadow-lg shadow-blue-500/20"
                >
                  Go to Dashboard
                </button>
              )}
            </div>

            <div className="rounded-xl overflow-hidden shadow-2xl shadow-blue-900/30">
              <img
                src={ATS_IMG}
                alt="ATS Dashboard"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 border-t border-blue-900/30 text-sm text-blue-400 mt-auto">
          <div className="flex justify-between items-center">
            <p>© {new Date().getFullYear()} YTFCS</p>
            <p>Internal ATS Platform</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
