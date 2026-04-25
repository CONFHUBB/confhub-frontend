'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Zap, Rocket, Loader2 } from 'lucide-react'
import { selectSubscriptionPlan } from '@/app/api/conference.api'
import { toast } from 'sonner'

interface SubscriptionPlanPickerProps {
    conferenceId: number
    onPlanSelected: () => void
}

const PLANS = [
    {
        id: 'STARTER',
        name: 'Starter',
        price: 0,
        priceLabel: 'Miễn phí',
        icon: Zap,
        color: 'border-gray-200 bg-white',
        btnClass: 'bg-gray-700 hover:bg-gray-800 text-white',
        badgeClass: 'bg-gray-100 text-gray-700',
        features: [
            { text: 'Tối đa 20 bài báo', included: true },
            { text: 'Tối đa 10 reviewer', included: true },
            { text: '1 track', included: true },
            { text: 'Tối đa 50 người đăng ký', included: true },
            { text: 'Kiểm tra đạo văn (AI)', included: false },
            { text: 'AI Gợi ý Reviewer', included: false },
            { text: 'Xuất CSV/PDF', included: false },
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
            { text: 'Tối đa 100 bài báo', included: true },
            { text: 'Tối đa 50 reviewer', included: true },
            { text: 'Tối đa 5 tracks', included: true },
            { text: 'Tối đa 300 người đăng ký', included: true },
            { text: 'Kiểm tra đạo văn (AI)', included: true },
            { text: 'AI Gợi ý Reviewer', included: true },
            { text: 'Xuất CSV/PDF', included: true },
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
            { text: 'Không giới hạn bài báo', included: true },
            { text: 'Không giới hạn reviewer', included: true },
            { text: 'Không giới hạn tracks', included: true },
            { text: 'Không giới hạn người đăng ký', included: true },
            { text: 'Kiểm tra đạo văn (AI)', included: true },
            { text: 'AI Gợi ý Reviewer', included: true },
            { text: 'Xuất CSV/PDF', included: true },
        ],
    },
]

export function SubscriptionPlanPicker({ conferenceId, onPlanSelected }: SubscriptionPlanPickerProps) {
    const [loading, setLoading] = useState<string | null>(null)

    const handleSelect = async (planId: string) => {
        setLoading(planId)
        try {
            const result = await selectSubscriptionPlan(conferenceId, planId)
            if (result.paymentUrl) {
                // Paid plan: redirect to VNPay
                toast.info('Đang chuyển đến trang thanh toán VNPay...')
                window.location.href = result.paymentUrl
            } else {
                // Free plan: activated immediately
                toast.success('Đã chọn gói thành công! Hội nghị đã được kích hoạt.')
                onPlanSelected()
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể chọn gói. Vui lòng thử lại.')
            setLoading(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight">Chọn gói đăng ký</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    Hội nghị đã được duyệt! Chọn gói phù hợp để kích hoạt hội nghị.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
                {PLANS.map((plan) => {
                    const Icon = plan.icon
                    return (
                        <Card
                            key={plan.id}
                            className={`relative flex flex-col transition-all hover:shadow-lg ${plan.color}`}
                        >
                            {plan.recommended && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <Badge className="bg-indigo-600 text-white text-[10px] px-3 py-0.5 shadow-md">
                                        Khuyến nghị
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
                                    <span className="text-xs text-muted-foreground ml-1">/ hội nghị</span>
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
                                    className={`w-full ${plan.btnClass}`}
                                    onClick={() => handleSelect(plan.id)}
                                    disabled={loading !== null}
                                >
                                    {loading === plan.id ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Đang xử lý...
                                        </>
                                    ) : plan.price === 0 ? (
                                        'Chọn gói miễn phí'
                                    ) : (
                                        'Chọn & Thanh toán'
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
