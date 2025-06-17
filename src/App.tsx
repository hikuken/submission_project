import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Home } from "./components/Home";
import { Admin } from "./components/Admin";
import { Submission } from "./components/Submission";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
          <h2 className="text-xl font-semibold text-slate-800">提出物管理システム</h2>
          <Authenticated>
            <SignOutButton />
          </Authenticated>
        </header>
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Content />} />
            <Route path="/admin/:adminUrl" element={<Admin />} />
            <Route path="/submit/:submissionUrl" element={<Submission />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </Router>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Authenticated>
        <Home />
      </Authenticated>
      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">提出物管理システムへようこそ</h1>
            <p className="text-slate-600">ログインして提出物の収集と管理を開始してください</p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
