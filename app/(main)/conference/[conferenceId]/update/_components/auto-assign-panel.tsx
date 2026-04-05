"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Wand2 } from "lucide-react"

interface AutoAssignPanelProps {
    minReviewers: number
    maxPapers: number
    bidWeight: number
    relevanceWeight: number
    loadBalancing: boolean
    running: boolean
    onMinReviewersChange: (val: number) => void
    onMaxPapersChange: (val: number) => void
    onBidWeightChange: (val: number) => void
    onLoadBalancingChange: (val: boolean) => void
    onRunAutoAssign: () => void
}

export function AutoAssignPanel({
    minReviewers,
    maxPapers,
    bidWeight,
    relevanceWeight,
    loadBalancing,
    running,
    onMinReviewersChange,
    onMaxPapersChange,
    onBidWeightChange,
    onLoadBalancingChange,
    onRunAutoAssign,
}: AutoAssignPanelProps) {
    return (
        <Card className="border-indigo-200 bg-indigo-50/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-indigo-600" />
                    Auto-Assign Configuration
                </CardTitle>
                <CardDescription>
                    Adjust parameters for the algorithm to find optimal assignments
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                            Min reviewers per paper
                        </label>
                        <Input
                            type="number"
                            min={1}
                            max={10}
                            value={minReviewers}
                            onChange={e => onMinReviewersChange(Number(e.target.value))}
                            className="bg-white"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                            Max papers per reviewer
                        </label>
                        <Input
                            type="number"
                            min={1}
                            max={50}
                            value={maxPapers}
                            onChange={e => onMaxPapersChange(Number(e.target.value))}
                            className="bg-white"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                        Weight: Bid ({(bidWeight * 100).toFixed(0)}%) vs Relevance ({(relevanceWeight * 100).toFixed(0)}%)
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={bidWeight * 100}
                        onChange={e => onBidWeightChange(Number(e.target.value) / 100)}
                        className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>← Prioritize Bid</span>
                        <span>Prioritize Relevance →</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="load-balancing"
                        checked={loadBalancing}
                        onChange={e => onLoadBalancingChange(e.target.checked)}
                        className="rounded border-gray-300"
                    />
                    <label htmlFor="load-balancing" className="text-sm">
                        <span className="font-medium">Load Balancing</span>
                        <span className="text-muted-foreground ml-1">— distribute papers evenly among reviewers</span>
                    </label>
                </div>

                <Button
                    onClick={onRunAutoAssign}
                    disabled={running}
                    className="w-full gap-2"
                >
                    {running ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Wand2 className="h-4 w-4" />
                    )}
                    {running ? "Running..." : "Run Auto-Assign"}
                </Button>
            </CardContent>
        </Card>
    )
}
