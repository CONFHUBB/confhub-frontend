"use client"

import { FileText, ArrowRight, Lock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Mock published papers data
const SAMPLE_PAPERS = [
    {
        id: 1,
        title: "Deep Learning Approaches for Natural Language Understanding in Low-Resource Languages",
        authors: "J. Smith, A. Chen, M. Park",
        conference: "EMNLP 2025",
        abstract: "This paper explores novel deep learning techniques for improving NLP performance in low-resource language settings, demonstrating significant improvements over baseline models...",
    },
    {
        id: 2,
        title: "Scalable Microservices Architecture for Real-Time Data Processing Pipelines",
        authors: "R. Kumar, S. Williams, T. Nguyen",
        conference: "ICSE 2025",
        abstract: "We present a scalable microservices architecture designed for real-time data processing, addressing latency challenges and fault tolerance in distributed systems...",
    },
    {
        id: 3,
        title: "Federated Learning with Differential Privacy: Balancing Accuracy and User Privacy",
        authors: "L. Zhang, K. Johnson, P. Lee",
        conference: "NeurIPS 2025",
        abstract: "This work proposes a novel federated learning framework that incorporates differential privacy guarantees while maintaining competitive model accuracy across heterogeneous data distributions...",
    },
    {
        id: 4,
        title: "Quantum-Inspired Optimization Algorithms for Combinatorial Problems",
        authors: "D. Brown, H. Tanaka, E. Silva",
        conference: "AAAI 2025",
        abstract: "We introduce quantum-inspired optimization algorithms that leverage superposition-like exploration strategies for solving NP-hard combinatorial problems efficiently on classical hardware...",
    },
    {
        id: 5,
        title: "Sustainable Computing: Energy-Efficient AI Model Training Strategies",
        authors: "F. Anderson, C. Wu, B. García",
        conference: "ISCA 2025",
        abstract: "Addressing the growing energy consumption of AI training, this paper presents novel energy-efficient strategies that reduce carbon footprint while maintaining model performance...",
    },
    {
        id: 6,
        title: "Human-AI Collaboration Frameworks for Complex Decision Making",
        authors: "M. Taylor, Y. Okamoto, A. Patel",
        conference: "CHI 2025",
        abstract: "We develop and evaluate collaborative frameworks where AI systems augment human decision-making processes, focusing on transparency, explainability, and trust calibration...",
    },
]

export function LatestPapers() {
    return (
        <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Research Library</span>
                        <h2 className="text-3xl font-extrabold text-gray-900 mt-2">Latest Published Papers</h2>
                        <p className="text-gray-500 mt-2 max-w-lg">Access cutting-edge research from top conferences. Sign in to read full papers.</p>
                    </div>
                    <Link href="/paper" className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                        Browse Library
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {/* Papers Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {SAMPLE_PAPERS.map((paper) => (
                        <div
                            key={paper.id}
                            className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300"
                        >
                            {/* Conference badge */}
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                                    {paper.conference}
                                </span>
                                <FileText className="h-4 w-4 text-gray-300" />
                            </div>

                            {/* Title */}
                            <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                {paper.title}
                            </h3>

                            {/* Authors */}
                            <p className="text-xs text-gray-400 mt-2">{paper.authors}</p>

                            {/* Abstract */}
                            <p className="text-sm text-gray-500 mt-3 line-clamp-3 leading-relaxed">
                                {paper.abstract}
                            </p>

                            {/* Read button */}
                            <div className="mt-5 flex items-center gap-2">
                                <Link
                                    href="/auth/login"
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    <Lock className="h-3.5 w-3.5" />
                                    Sign in to read
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mobile CTA */}
                <div className="mt-8 text-center md:hidden">
                    <Link href="/paper">
                        <Button variant="outline" className="rounded-full px-6">
                            Browse Library
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    )
}
