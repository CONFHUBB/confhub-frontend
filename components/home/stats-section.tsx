"use client"

const LOGOS = [
    "MIT",
    "Stanford University",
    "ETH Zürich",
    "University of Oxford",
    "Tsinghua University",
    "Max Planck Institute",
    "NTU Singapore",
    "CMU",
]

export function StatsSection() {
    return (
        <section className="py-12 bg-neutral border-y border-secondary/8 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-8">
                <p className="text-center text-sm font-medium text-text-light tracking-wide uppercase">
                    Trusted by academic institutions worldwide
                </p>
            </div>

            <div className="relative">
                {/* Fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-neutral to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-neutral to-transparent z-10 pointer-events-none" />

                {/* Scrolling strip — duplicated for seamless loop */}
                <div className="logo-scroll flex items-center gap-16 w-max">
                    <LogoRow />
                    <LogoRow />
                </div>
            </div>
        </section>
    )
}

function LogoRow() {
    return (
        <div className="flex items-center gap-16 text-secondary/40">
            {LOGOS.map((name) => (
                <span
                    key={name}
                    className="font-heading font-bold text-xl whitespace-nowrap tracking-tight"
                >
                    {name}
                </span>
            ))}
        </div>
    )
}
