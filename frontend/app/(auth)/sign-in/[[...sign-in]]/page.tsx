import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 soft-yellow-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl yellow-gradient text-slate-900 font-bold shadow-xl mb-4 text-2xl">
            AI
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-slate-500 font-medium">Log in to your Discovery Dashboard</p>
        </div>

        <div className="glass p-1 border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <SignIn 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none border-none p-4",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "rounded-xl border-slate-200 bg-white/50 hover:bg-white transition-all font-bold text-slate-700",
                formButtonPrimary: "yellow-gradient text-slate-900 font-bold rounded-xl h-11 shadow-lg hover:shadow-xl transition-all",
                formFieldInput: "bg-white/50 border-slate-200 focus:border-yellow-500 focus:bg-white rounded-xl h-10 transition-all",
                footerActionText: "text-slate-500 font-medium",
                footerActionLink: "text-yellow-600 font-bold hover:text-yellow-700",
                identityPreviewText: "text-slate-900 font-bold",
                identityPreviewEditButton: "text-yellow-600 font-bold",
              }
            }}
          />
        </div>
        
        <p className="text-center mt-8 text-xs text-slate-400 font-semibold tracking-widest uppercase">
          Powered by AI Lead Engine v2.0
        </p>
      </div>
    </div>
  );
}
