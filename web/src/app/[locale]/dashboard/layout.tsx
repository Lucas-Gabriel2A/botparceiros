import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#060609] text-white font-sans overflow-hidden">
       <Sidebar />
       <main className="flex-1 overflow-y-auto relative">
         {/* Background noise/gradient specific to dashboard */}
         <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/20 blur-[100px] rounded-full"></div>
         </div>
         
         <div className="relative z-10 p-8 md:p-12 max-w-7xl mx-auto">
            {children}
         </div>
       </main>
    </div>
  )
}
