import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";
import { useAppStore } from "../store/useAppStore";
import { verifyOtp } from "../services/auth.service.js";
import toast from "react-hot-toast";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");

  const navigate = useAppStore((s) => s.navigate);

  const handleVerifyOtp = async (e) => {
  e.preventDefault();

  const email = sessionStorage.getItem("pendingEmail");

  if (!email) {
    alert("Session expired");
    navigate("signup");
    return;
  }

  try {
    const data = await verifyOtp({ email, otp });
    sessionStorage.clear();
    toast.success(data.message);
    navigate("login");
  } catch (err) {
    alert(err.response?.data?.message || "OTP verification failed");
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("signup")}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 mb-6"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <Card className="p-8">
          <h2 className="text-xl font-semibold text-center mb-4">
            Verify your email
          </h2>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <input
              className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />

            <Button className="w-full">Verify & Continue</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
