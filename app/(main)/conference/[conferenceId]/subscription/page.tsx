'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Zap, Rocket, Loader2, ArrowLeft } from 'lucide-react'
import { selectSubscriptionPlan, getConference } from '@/app/api/conference.api'
import { toast } from 'sonner'

const PLANS = [
    {
        id: 'STARTER',
        name: 'Starter',
        price: 0,
        priceLabel: 'Free',
        icon: Zap,
        color: 'border-gray-200 bg-white',
        btnClass: 'bg-gray-700 hover:bg-gray-800 text-white',
        badgeClass: 'bg-gray-100 text-gray-700',
        features: [
            { text: 'Up to 20 papers', included: true },
            { text: 'Up to 10 reviewers', included: true },
            { text: '1 track', included: true },
            { text: 'Up to 50 registrations', included: true },
            { text: 'AI Plagiarism Check', included: false },
            { text: 'AI Reviewer Suggestion', included: false },
            { text: 'Export CSV/PDF', included: false },
        ],
    },
    {
        id: 'PROFESSIONAL',
        name: 'Professional',
        price: 500000,
        priceLabel: '500,000 VND',
        icon: Crown,
        color: 'border-indigo-300 bg-indigo-50/40 ring-2 ring-indigo-200',
        btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        badgeClass: 'bg-indigo-100 text-indigo-700',
        recommended: true,
        features: [
            { text: 'Up to 100 papers', included: true },
            { text: 'Up to 50 reviewers', included: true },
            { text: 'Up to 5 tracks', included: true },
            { text: 'Up to 300 registrations', included: true },
            { text: 'AI Plagiarism Check', included: true },
            { text: 'AI Reviewer Suggestion', included: true },
            { text: 'Export CSV/PDF', included: true },
        ],
    },
    {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        price: 2000000,
        priceLabel: '2,000,000 VND',
        icon: Rocket,
        color: 'border-purple-300 bg-purple-50/30',
        btnClass: 'bg-purple-600 hover:bg-purple-700 text-white',
        badgeClass: 'bg-purple-100 text-purple-700',
        features: [
            { text: 'Unlimited papers', included: true },
            { text: 'Unlimited reviewers', included: true },
            { text: 'Unlimited tracks', included: true },
            { text: 'Unlimited registrations', included: true },
            { text: 'AI Plagiarism Check', included: true },
            { text: 'AI Reviewer Suggestion', included: true },
            { text: 'Export CSV/PDF', included: true },
        ],
    },
]

export default function SubscriptionPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const conferenceId = Number(params.conferenceId)

    const [loading, setLoading] = useState<string | null>(null)
    const [conferenceName, setConferenceName] = useState<string>('')
    const [conferenceStatus, setConferenceStatus] = useState<string>('')
    const [currentPlan, setCurrentPlan] = useState<string | null>(null)
    const [pageLoading, setPageLoading] = useState(true)
    const toastShown = useRef(false)

    useEffect(() => {
        // Handle VNPay payment status redirect
        const status = searchParams.get('status')
        if (status && !toastShown.current) {
            toastShown.current = true
            if (status === 'success') {
                toast.success('Payment successful! Your conference has been activated.')
            } else if (status === 'failed') {
                toast.error('Payment failed or was cancelled. Please try again.')
            }
            // Remove the status param from the URL
            const url = new URL(window.location.href)
            url.searchParams.delete('status')
            window.history.replaceState({}, '', url.toString())
        }
    }, [searchParams])

    useEffect(() => {
        const fetchConference = async () => {
            try {
                const conf = await getConference(conferenceId)
                setConferenceName(conf.name)
                setConferenceStatus(conf.status)
                setCurrentPlan(conf.subscriptionPlan || null)
            } catch {
                toast.error('Failed to load conference details')
            } finally {
                setPageLoading(false)
            }
        }
        fetchConference()
    }, [conferenceId])

    const handleSelect = async (planId: string) => {
        setLoading(planId)
        try {
            const result = await selectSubscriptionPlan(conferenceId, planId)
            if (result.paymentUrl) {
                toast.info('Redirecting to VNPay payment page...')
                window.location.href = result.paymentUrl
            } else {
                toast.success('Plan selected successfully! Conference has been activated.')
                router.push(`/conference/${conferenceId}/update`)
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to select plan. Please try again.')
            setLoading(null)
        }
    }

    if (pageLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const isAlreadyActive = conferenceStatus === 'OPEN' || conferenceStatus === 'SETUP' || conferenceStatus === 'COMPLETED'

    return (
        <div className="page-base max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/conference/${conferenceId}/update`)}
                    className="shrink-0"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Subscription Plan</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {conferenceName && <span className="font-medium text-foreground">{conferenceName}</span>}
                        {conferenceName && ' — '}
                        Select a plan to activate your conference.
                    </p>
                </div>
            </div>

            {/* Current plan info */}
            {currentPlan && isAlreadyActive && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-emerald-600" />
                        <div>
                            <p className="font-semibold text-emerald-800">
                                Current plan: <span className="uppercase">{currentPlan}</span>
                            </p>
                            <p className="text-sm text-emerald-700 mt-0.5">
                                Your conference is active. You can upgrade your plan below.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {conferenceStatus === 'PENDING_PAYMENT' && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 text-orange-600" />
                        <div>
                            <p className="font-semibold text-orange-800">Payment Pending</p>
                            <p className="text-sm text-orange-700 mt-0.5">
                                Your conference is awaiting payment confirmation. Please select a plan and complete the payment below.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Plan selection heading */}
            <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight">Choose Your Plan</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    {conferenceStatus === 'APPROVED'
                        ? 'Your conference has been approved! Select a plan to activate it.'
                        : 'Select the plan that best fits your conference needs.'}
                </p>
            </div>

            {/* Plan cards */}
            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
                {PLANS.map((plan) => {
                    const Icon = plan.icon
                    const isCurrentPlan = currentPlan === plan.id
                    return (
                        <Card
                            key={plan.id}
                            className={`relative flex flex-col transition-all hover:shadow-lg ${plan.color} ${isCurrentPlan ? 'ring-2 ring-emerald-400' : ''}`}
                        >
                            {plan.recommended && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <Badge className="bg-indigo-600 text-white text-[10px] px-3 py-0.5 shadow-md">
                                        Recommended
                                    </Badge>
                                </div>
                            )}
                            {isCurrentPlan && (
                                <div className="absolute -top-3 right-4">
                                    <Badge className="bg-emerald-600 text-white text-[10px] px-3 py-0.5 shadow-md">
                                        Current
                                    </Badge>
                                </div>
                            )}
                            <CardHeader className="pb-2 pt-6 text-center">
                                <div className="mx-auto mb-2 rounded-full bg-white p-3 shadow-sm border">
                                    <Icon className="h-6 w-6 text-indigo-600" />
                                </div>
                                <CardTitle className="text-lg">{plan.name}</CardTitle>
                                <div className="mt-2">
                                    <span className="text-3xl font-bold tracking-tight">
                                        {plan.price === 0 ? 'Free' : plan.priceLabel}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-1">/ conference</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col pt-2">
                                <ul className="space-y-2.5 flex-1 mb-6">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            {f.included ? (
                                                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                            ) : (
                                                <span className="h-4 w-4 mt-0.5 shrink-0 text-center text-muted-foreground/40">✕</span>
                                            )}
                                            <span className={f.included ? 'text-foreground' : 'text-muted-foreground/60 line-through'}>
                                                {f.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    className={`w-full ${isCurrentPlan ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : plan.btnClass}`}
                                    onClick={() => handleSelect(plan.id)}
                                    disabled={loading !== null || isCurrentPlan}
                                >
                                    {loading === plan.id ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Processing...
                                        </>
                                    ) : isCurrentPlan ? (
                                        'Current Plan'
                                    ) : plan.price === 0 ? (
                                        'Select Free Plan'
                                    ) : (
                                        'Select & Pay'
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
