const fs = require('fs');
const path = require('path');

const files = [
    "app/(main)/conference/[conferenceId]/update/reviewer-assignment.tsx",
    "app/(main)/conference/[conferenceId]/update/page.tsx",
    "app/(main)/conference/[conferenceId]/reviewer/reviewer-console.tsx",
    "app/(main)/conference/[conferenceId]/reviewer/bidding/page.tsx",
    "app/(main)/conference/[conferenceId]/reviewer/review/[reviewId]/page.tsx",
    "app/(main)/conference/[conferenceId]/reviewer/interests/page.tsx",
    "app/(main)/conference/[conferenceId]/page.tsx",
    "app/(main)/conference/[conferenceId]/paper/[paperId]/camera-ready/page.tsx",
    "app/(main)/conference/[conferenceId]/email/page.tsx",
    "app/(main)/conference/[conferenceId]/author/page.tsx",
    "app/(main)/conference/[conferenceId]/chair/decisions/page.tsx"
];

for (const fp of files) {
    const fullPath = path.join(__dirname, fp);
    if (!fs.existsSync(fullPath)) continue;
    let content = fs.readFileSync(fullPath, 'utf8');

    // Add import
    if (!content.includes("import { BackButton }")) {
        // find last import
        const match = content.match(/import .* from '.*'\n/g);
        if (match && match.length > 0) {
            const lastImportPos = content.lastIndexOf(match[match.length - 1]);
            content = content.substring(0, lastImportPos + match[match.length - 1].length) + 
                      "import { BackButton } from '@/components/shared/back-button'\n" + 
                      content.substring(lastImportPos + match[match.length - 1].length);
        }
    }

    // Replace <Button ... onClick={() => router.back()} ...> <ArrowLeft .../> Back </Button>
    content = content.replace(/<Button[^>]*onClick=\{\(\) => router\.back\(\)\}[^>]*>[\s\S]*?<ArrowLeft[^>]*>[\s\S]*?(Back( to .*)?)<\/Button>/g, 
        '<BackButton fallbackUrl={`/conference/${conferenceId}`} />');
    
    // Replace <Link...><Button...><ArrowLeft/>...</Button></Link>
    content = content.replace(/<Link href=\{[^}]*\}>(?:\s*)<Button[^>]*>(?:[\s\S]*?)<ArrowLeft[^>]*>(?:[\s\S]*?)(Back(?: to .*)?)<\/Button>(?:\s*)<\/Link>/g, 
        '<BackButton fallbackUrl={`/conference/${conferenceId}`} className="mb-4" />');

    // Replace raw button with ArrowLeft and text 'back'
    // Actually we will use fallbackUrl={`/conference/${conferenceId}`} which usually exists. if conferenceId doesn't exist, we'll see.
    
    fs.writeFileSync(fullPath, content);
    console.log("Updated", fp);
}
