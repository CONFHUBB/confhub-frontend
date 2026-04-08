"use client"

import { Settings2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-6 pb-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground text-sm mt-0.5">System configuration and preferences</p>
            </div>
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-indigo-600" />
                        System Settings
                    </CardTitle>
                    <CardDescription>Configuration options will be available in a future update.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-40 rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground text-sm">
                        Coming soon
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
