import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ThumbsUp,
  MapPin,
  Calendar,
  ShieldCheck,
  Camera,
  Loader2,
  Info,
  AlertTriangle,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "./Button";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { useAppStore } from "../store/useAppStore";
import { complaintService } from "../services/complaint.service";
import toast from "react-hot-toast";

export function IssueDetail({ issue, userRole }) {
  const navigate = useAppStore((state) => state.navigate);

  // Loading & Sync States
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // UI States
  const [upvoted, setUpvoted] = useState(issue.hasUpvoted || false);
  const [upvoteCount, setUpvoteCount] = useState(issue.upvoteCount || 0);
  const voteStatusRef = useRef(issue.hasUpvoted || false);

  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [status, setStatus] = useState(issue.status);
  const [remarks, setRemarks] = useState(issue.authorityRemarks || "");
  const [afterFixImage, setAfterFixImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    const fetchIssue = async () => {
      const res = await complaintService.getComplaintById(issue._id);
      if (res.success) {
        useAppStore.setState({ selectedIssue: res.data });
      }
    };

    fetchIssue();
  }, [issue._id]);

  // Sync state if the 'issue' prop changes
  useEffect(() => {
    voteStatusRef.current = issue.hasUpvoted || false;
    setUpvoted(issue.hasUpvoted || false);
    setUpvoteCount(issue.upvoteCount || 0);
    setStatus(issue.status);
    setRemarks(issue.authorityRemarks || "");
  }, [issue]);

  const formatDate = (dateString) => {
    if (!dateString) return "Date N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Invalid Date"
      : new Intl.DateTimeFormat("en-IN", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(date);
  };

  const handleUpvoteToggle = async () => {
    if (isVoting) return;
    const wasUpvoted = voteStatusRef.current;
    const willBeUpvoted = !wasUpvoted;
    const prevCount = upvoteCount;

    setIsVoting(true);
    voteStatusRef.current = willBeUpvoted;
    setUpvoted(willBeUpvoted);
    setUpvoteCount((c) => Math.max(0, willBeUpvoted ? c + 1 : c - 1));

    try {
      if (willBeUpvoted) await complaintService.upvoteComplaint(issue._id);
      else await complaintService.removeUpvote(issue._id);
    } catch (error) {
      const msg = error.response?.data?.message?.toLowerCase() || "";
      if (msg.includes("already upvoted")) {
        voteStatusRef.current = true;
        setUpvoted(true);
      } else {
        voteStatusRef.current = wasUpvoted;
        setUpvoted(wasUpvoted);
        setUpvoteCount(prevCount);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAfterFixImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdateStatus = async () => {
    // Frontend validation to prevent the 400 error alert
    if (status === "resolved" && !afterFixImage) {
      return toast.error("After-fix image is mandatory for resolution");
    }

    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append("status", status);
      formData.append("authorityRemarks", remarks);
      // Backend expects 'image' key for the file upload
      if (afterFixImage) formData.append("image", afterFixImage);

      const res = await complaintService.updateComplaintStatus(
        issue._id,
        formData,
      );

      if (res.success) {
        toast.success("Status updated successfully");
        setShowUpdateForm(false);
        navigate("authority-dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() =>
              navigate(
                userRole === "authority"
                  ? "authority-dashboard"
                  : "citizen-dashboard",
              )
            }
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
            Case ID: {issue._id}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 w-full">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] bg-white dark:bg-slate-900">
              <div className="relative aspect-video group bg-slate-200 dark:bg-slate-800">
                <img
                  src={
                    issue.imageUrl ||
                    "https://via.placeholder.com/800x450?text=No+Evidence"
                  }
                  className="w-full h-full object-cover"
                  alt="Evidence"
                />
                <div className="absolute top-6 left-6 flex gap-2">
                  <Badge status={status} className="shadow-lg border-none" />
                  <Badge
                    priority={issue.aiSeverity || "medium"}
                    className="shadow-lg border-none"
                  />
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-cyan-400">
                    <Info size={18} />
                    <h2 className="text-[10px] font-black uppercase tracking-widest">
                      Initial Report
                    </h2>
                  </div>
                  {userRole === "citizen" && (
                    <Button
                      variant={upvoted ? "primary" : "outline"}
                      onClick={handleUpvoteToggle}
                      disabled={isVoting}
                      className={`h-10 rounded-xl transition-all ${
                        upvoted ? "bg-blue-600 text-white" : ""
                      }`}
                    >
                      {isVoting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ThumbsUp
                          className={`w-4 h-4 mr-2 ${
                            upvoted ? "fill-current" : ""
                          }`}
                        />
                      )}
                      {upvoteCount} Community Votes
                    </Button>
                  )}
                </div>
                <p className="text-xl text-slate-800 dark:text-slate-200 font-medium italic">
                  "{issue.description || "No description provided."}"
                </p>
              </div>
            </Card>

            {/* AI Analysis Card */}
            <Card className="p-6 dark:border-slate-800 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-slate-800/30">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
                AI Vision Analysis
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    Category
                  </p>
                  <p className="font-black text-slate-900 dark:text-white capitalize">
                    {issue.aiCategory || "Other"}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    Confidence
                  </p>
                  <p className="font-black text-slate-900 dark:text-white">
                    {issue.aiConfidence
                      ? `${(issue.aiConfidence * 100).toFixed(0)}%`
                      : "—"}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    Source
                  </p>
                  <p className="font-black text-slate-900 dark:text-white">
                    {issue.aiStatus === "ai" ? "AI" : "Fallback"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {issue.aiKeywords?.length > 0 ? (
                  issue.aiKeywords.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-white dark:bg-slate-800 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700"
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic text-xs">
                    Awaiting processing...
                  </span>
                )}
              </div>
            </Card>

            {(issue.authorityRemarks || issue.afterFixImageUrl) && (
              <Card className="p-8 border-none shadow-2xl bg-blue-600 text-white rounded-[2rem]">
                <div className="flex items-center gap-3 mb-6">
                  <ShieldCheck size={28} />
                  <h2 className="text-2xl font-bold italic">
                    Resolution Update
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <p className="text-blue-50 leading-relaxed font-medium">
                    {issue.authorityRemarks}
                  </p>
                  {issue.afterFixImageUrl && (
                    <img
                      src={issue.afterFixImageUrl}
                      className="rounded-2xl shadow-2xl border-4 border-white/20"
                      alt="Fixed"
                    />
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="p-6 dark:border-slate-800 rounded-3xl space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Location
                    </p>
                    <p className="text-xs font-bold dark:text-white mt-1">
                      {issue.wardId?.name || "Prayagraj Ward"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Reported On
                    </p>
                    <p className="text-xs font-bold dark:text-white mt-1">
                      {formatDate(issue.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
              {/* 🔥 PRIORITY SCORE (NOW FOR CITIZENS TOO) */}
              {issue.priorityScore > 0 && (
                <Card className="p-6 bg-orange-50/40 dark:bg-orange-950/30">
                  <div className="flex justify-between items-center text-orange-600">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} />
                      <span className="text-[10px] font-black uppercase">
                        Priority Score
                      </span>
                    </div>
                    <span className="text-2xl font-black">
                      {issue.priorityScore}%
                    </span>
                  </div>
                </Card>
              )}
              {userRole === "authority" && (
                <div className="pt-6 border-t dark:border-slate-800">
                  {!showUpdateForm ? (
                    <Button
                      className="w-full h-14 rounded-2xl bg-blue-600"
                      onClick={() => setShowUpdateForm(true)}
                    >
                      Update Status
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-sm border dark:border-slate-700 outline-none"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="acknowledged">Acknowledge</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>

                      {/* MANDATORY IMAGE SECTION FOR RESOLUTION */}
                      {status === "resolved" && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase">
                            After-fix Evidence
                          </label>
                          <div className="relative group">
                            {previewUrl ? (
                              <div className="relative rounded-xl overflow-hidden aspect-video">
                                <img
                                  src={previewUrl}
                                  className="w-full h-full object-cover"
                                  alt="Preview"
                                />
                                <button
                                  onClick={() => {
                                    setAfterFixImage(null);
                                    setPreviewUrl(null);
                                  }}
                                  className="absolute top-2 right-2 p-1 bg-red-600 rounded-full text-white"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-slate-700 rounded-xl hover:bg-slate-800/50 cursor-pointer transition-colors">
                                <UploadCloud
                                  className="text-slate-500 mb-2"
                                  size={24}
                                />
                                <span className="text-[10px] text-slate-500">
                                  Upload Image
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handleImageChange}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}

                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Resolution details..."
                        className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs border dark:border-slate-700 resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowUpdateForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1 bg-green-600"
                          onClick={handleUpdateStatus}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
