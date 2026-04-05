'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUserById, getUserProfile } from '@/app/api/user.api'
import type { User, UserProfile } from '@/types/user'
import { getCurrentUserId } from '@/lib/auth'
import { Breadcrumb } from '@/components/shared/breadcrumb'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
    Loader2, Building2, MapPin, Globe, GraduationCap, BookOpen,
    Mail, Phone, Briefcase, Edit, ExternalLink, User as UserIcon
} from 'lucide-react'

// ── Academic profile link configs ────────────────────────────────────────────
const ACADEMIC_LINKS = [
    {
        key: 'orcid' as const,
        label: 'ORCID',
        icon: <BookOpen className="h-4 w-4" />,
        color: 'bg-emerald-500/10 text-emerald-600',
        buildUrl: (id: string) => id.startsWith('http') ? id : `https://orcid.org/${id}`,
    },
    {
        key: 'googleScholarLink' as const,
        label: 'Google Scholar',
        icon: <GraduationCap className="h-4 w-4" />,
        color: 'bg-indigo-500/10 text-indigo-600',
        buildUrl: (id: string) => id,
    },
    {
        key: 'dblpId' as const,
        label: 'DBLP',
        icon: <Globe className="h-4 w-4" />,
        color: 'bg-yellow-500/10 text-yellow-600',
        buildUrl: (id: string) => id.startsWith('http') ? id : `https://dblp.org/pid/${id}`,
    },
    {
        key: 'semanticScholarId' as const,
        label: 'Semantic Scholar',
        icon: <BookOpen className="h-4 w-4" />,
        color: 'bg-purple-500/10 text-purple-600',
        buildUrl: (id: string) => id.startsWith('http') ? id : `https://www.semanticscholar.org/author/${id}`,
    },
]

export default function PublicProfilePage() {
    const params = useParams()
    const router = useRouter()
    const userId = Number(params.userId)

    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Check if viewer is the profile owner
    const currentUserId = useMemo(() => getCurrentUserId(), [])
    const isOwner = currentUserId !== null && currentUserId === userId

    useEffect(() => {
        if (!userId || isNaN(userId)) {
            setError('Invalid user ID')
            setLoading(false)
            return
        }

        const fetchData = async () => {
            try {
                setLoading(true)
                const [userData, profileData] = await Promise.all([
                    getUserById(userId),
                    getUserProfile(userId).catch(() => null),
                ])
                setUser(userData)
                setProfile(profileData)
            } catch (err: any) {
                if (err.response?.status === 404) {
                    setError('User not found.')
                } else {
                    setError('Failed to load profile.')
                }
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [userId])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading profile...</p>
                </div>
            </div>
        )
    }

    if (error || !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <UserIcon className="h-16 w-16 text-muted-foreground/30" />
                <p className="text-muted-foreground text-lg">{error || 'User not found'}</p>
                <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
            </div>
        )
    }

    const initials = user.fullName
        ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U'

    const hasAffiliation = profile?.institution || profile?.department
    const hasContact = profile?.phoneOffice || profile?.phoneMobile || profile?.websiteUrl
    const hasAcademic = ACADEMIC_LINKS.some(link => profile?.[link.key])
    const hasBio = profile?.biography

    return (
        <div className="container mx-auto py-6 px-4 max-w-4xl">
            <Breadcrumb items={[
                { label: 'Home', href: '/' },
                { label: user.fullName || 'User Profile' },
            ]} />

            {/* ── Hero Header ── */}
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10 mb-6">
                <CardContent className="pt-8 pb-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 blur-sm" />
                            <Avatar className="relative h-28 w-28 ring-4 ring-background shadow-xl">
                                <AvatarImage src={profile?.avatarUrl} alt={user.fullName || 'User'} />
                                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary/20 to-primary/5">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        {/* Info */}
                        <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                            <h1 className="text-3xl font-bold tracking-tight">{user.fullName || 'User'}</h1>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                                <Mail className="h-3.5 w-3.5" />
                                {user.email}
                            </p>

                            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start mt-2">
                                {profile?.userType && (
                                    <Badge variant="secondary" className="bg-primary/10 text-primary capitalize">
                                        {profile.userType.toLowerCase()}
                                    </Badge>
                                )}
                                {profile?.jobTitle && (
                                    <Badge variant="outline" className="gap-1">
                                        <Briefcase className="h-3 w-3" />
                                        {profile.jobTitle}
                                    </Badge>
                                )}
                                {user.country && (
                                    <Badge variant="outline" className="gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {user.country}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Edit button (owner only) */}
                        {isOwner && (
                            <div className="sm:self-start shrink-0">
                                <Link href="/my-profile">
                                    <Button variant="outline" className="gap-2 shadow-sm">
                                        <Edit className="h-4 w-4" />
                                        Edit Profile
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
                {/* ── Left Column: Bio + Academic ── */}
                <div className="md:col-span-2 space-y-6">
                    {/* Biography */}
                    {hasBio && (
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <UserIcon className="h-5 w-5 text-primary" />
                                    About
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                                    {profile?.biography}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Affiliation */}
                    {hasAffiliation && (
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    Affiliation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Primary institution */}
                                {profile?.institution && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                        <Building2 className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="font-medium text-sm">{profile.institution}</p>
                                            {profile.department && (
                                                <p className="text-xs text-muted-foreground">{profile.department}</p>
                                            )}
                                            {profile.institutionCountry && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <MapPin className="h-3 w-3" /> {profile.institutionCountry}
                                                </p>
                                            )}
                                            {profile.institutionUrl && (
                                                <a
                                                    href={profile.institutionUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1"
                                                >
                                                    <ExternalLink className="h-3 w-3" /> Visit website
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Secondary institution */}
                                {profile?.secondaryInstitution && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                        <Building2 className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                                                Secondary
                                            </p>
                                            <p className="font-medium text-sm">{profile.secondaryInstitution}</p>
                                            {profile.secondaryCountry && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <MapPin className="h-3 w-3" /> {profile.secondaryCountry}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* No profile data at all */}
                    {!hasBio && !hasAffiliation && !hasAcademic && !hasContact && (
                        <Card className="shadow-sm border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <UserIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <p className="text-muted-foreground font-medium">No profile information yet</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {isOwner
                                        ? 'Complete your profile to help others know you better.'
                                        : 'This user hasn\'t filled in their profile yet.'}
                                </p>
                                {isOwner && (
                                    <Link href="/my-profile" className="mt-4">
                                        <Button className="gap-2">
                                            <Edit className="h-4 w-4" />
                                            Complete Profile
                                        </Button>
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ── Right Column: Contact + Academic Links ── */}
                <div className="space-y-6">
                    {/* Contact Info */}
                    {hasContact && (
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Phone className="h-5 w-5 text-primary" />
                                    Contact
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {profile?.phoneOffice && (
                                    <div className="flex items-center gap-2.5 text-sm">
                                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Office</p>
                                            <p>{profile.phoneOffice}</p>
                                        </div>
                                    </div>
                                )}
                                {profile?.phoneMobile && (
                                    <div className="flex items-center gap-2.5 text-sm">
                                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Mobile</p>
                                            <p>{profile.phoneMobile}</p>
                                        </div>
                                    </div>
                                )}
                                {profile?.websiteUrl && (
                                    <>
                                        <Separator />
                                        <a
                                            href={profile.websiteUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2.5 text-sm text-indigo-600 hover:underline"
                                        >
                                            <Globe className="h-4 w-4 shrink-0" />
                                            Personal Website
                                            <ExternalLink className="h-3 w-3 ml-auto" />
                                        </a>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Academic Profiles */}
                    {hasAcademic && (
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <GraduationCap className="h-5 w-5 text-primary" />
                                    Research Profiles
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {ACADEMIC_LINKS.map(link => {
                                    const value = profile?.[link.key]
                                    if (!value) return null
                                    return (
                                        <a
                                            key={link.key}
                                            href={link.buildUrl(value)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${link.color} shrink-0`}>
                                                {link.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium group-hover:text-indigo-600 transition-colors">
                                                    {link.label}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">{value}</p>
                                            </div>
                                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-indigo-500 shrink-0" />
                                        </a>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
