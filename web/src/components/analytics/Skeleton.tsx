export function AnalyticsSkeleton() {
    return (
        <div className="w-full space-y-8 animate-in fade-in duration-700">
            {/* Period Selector Skeleton */}
            <div className="flex justify-center w-full mb-8">
                <div className="w-[340px] h-12 rounded-xl bg-white/5 border border-white/10 animate-shimmer" />
            </div>

            {/* Grid 4x2 Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div 
                        key={i} 
                        className="bg-white/[0.02] border border-white/5 rounded-2xl h-[120px] p-5 flex flex-col justify-between animate-shimmer"
                        style={{
                            animationDelay: `${i * 100}ms`
                        }}
                    >
                        <div className="w-1/3 h-4 bg-white/10 rounded-md" />
                        <div className="w-2/3 h-8 bg-white/10 rounded-md" />
                    </div>
                ))}
            </div>

            {/* Chart Skeleton */}
            <div className="w-full bg-[#0A0A0C] border border-white/10 rounded-2xl p-6 h-[400px] flex flex-col gap-4 animate-shimmer">
                <div className="w-48 h-6 bg-white/10 rounded-md" />
                <div className="flex-1 w-full bg-white/5 rounded-lg" />
            </div>
        </div>
    );
}
