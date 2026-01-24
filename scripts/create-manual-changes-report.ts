
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The list of updates approved by the user (Copied from apply-manual-url-updates.ts)
const manualUpdates = [
    { name: "South Eastern VTC-Kyambiti", newUrl: "https://www.seku.ac.ke/technical-vocational-education-and-training-tvet-directorate.html" },
    { name: "TEWA TRAINING CENTER", newUrl: "https://www.tewa.ac.ke/" },
    { name: "SHANG TAO MEDIA COLLEGE", newUrl: "https://www.shangtao.ac.ke/" },
    { name: "Idia College of Technology and Development Studies", newUrl: "https://idiacollege.ac.ke/wp-content/uploads/2024/08/IDIA-COLLEGE-INFO-PACK-BROCHURE-UPDATED-22-08-20242.pdf" },
    { name: "INTERNATIONAL HOTEL AND TOURISM INSTITUTE", newUrl: "https://ihti.net/" },
    { name: "TASK CATERING TRAINING INSTITUTE", newUrl: "https://thetaskcateringtraininginstitute.co.ke/" },
    { name: "P.C.E.A KIKUYU HOSPITAL SCHOOL OF NURSING", newUrl: "https://pceakikuyuhospital.org/nursing-school" },
    { name: "PAC Institute of Technology and Social Studies", newUrl: "https://www.pacuniversity.ac.ke/pac-institute/" },
    { name: "ELY-YON TRAINING INSTITUTE", newUrl: "https://ava-nurse.com/ely-yon-training-institute/" },
    { name: "South Eastern VTC Kyambiti", newUrl: "https://seku.ac.ke/south-eastern-kenya-university-tvet-admissions.html" },
    { name: "Meru University of Science and Technology TVET Directorate", newUrl: "https://www.must.ac.ke/directorate-tvet/" },
    { name: "ASHLEYS HAIR AND BEAUTY ACADEMY", newUrl: "https://ashleyskenya.com/academy/" },
    { name: "Jomo Kenyatta University of Agriculture and Technology TVET Directorate", newUrl: "https://www.jkuat.ac.ke/directorate/tvet/" },
    { name: "Milestone Institute of Professional Studies Nakuru Campus", newUrl: "https://www.milestoneinstitute.ac.ke/nakuru/" },
    { name: "Arizona International College Thika", newUrl: "https://arizonainternationalcollege.africa/" },
    { name: "Kimlea Hospitality Training College", newUrl: "https://www.kimlea.ac.ke/" },
    { name: "Support for Addictions, Prevention& Treatment in Africa (SAPTA) College", newUrl: "https://sapta.or.ke/" },
    { name: "KENYA METHODIST UNIVERSITY TVET INSTITUTE", newUrl: "https://kemu.ac.ke/kemu-tvet-institute" },
    { name: "Eldoret Technical Training Institute- Kapseret campus", newUrl: "https://eldorettti.ac.ke/etti-ttc/" },
    { name: "Kenya School of Agriculture - Ainabkoi Campus", newUrl: "https://ksa.ac.ke/ainabkoi-campus/" },
    { name: "St. Paul's University TVET Center - Nakuru Campus", newUrl: "https://spu.ac.ke/index.php/tvet-institute" },
    // Soft Matches (Section 2)
    { name: "Procare Training Centre", newUrl: "https://procarecentre.co.ke/" },
    { name: "Eldoret Beauty Training College", newUrl: "https://eldoretbeautycollege.org/" },
    { name: "Orem College Of Health And Professional Studies", newUrl: "https://oremcollege.ac.ke/" },
    { name: "Alika Medical Training College", newUrl: "https://www.alikamedical.co.ke/" },
    { name: "RIFT VALLEY INSTITUTE OF SCIENCE AND TECHNOLOGY KERICHO TOWN CAMPUS", newUrl: "https://rvist.kisomokenya.com/" },
    { name: "AMREF VIRTUAL TRAINING SCHOOL", newUrl: "https://amref.org/basic-and-post-basic-training-2/" },
    { name: "RVIST - KURESOI CAMPUS", newUrl: "https://rvist.kisomokenya.com/about/" }
];

async function main() {
    let output = "# 📝 Manually Updated Institutions\n\n";
    output += "_The following institutions in Section 1 and 2 were updated manually based on your feedback_.\n\n";
    output += "| # | Institution | New URL (Verified) |\n";
    output += "|---|---|---|\n";

    manualUpdates.forEach((item, index) => {
        output += `| ${index + 1} | ${item.name} | ${item.newUrl} |\n`;
    });

    const outputPath = path.join(__dirname, 'data', 'manual_changes_summary.md');
    fs.writeFileSync(outputPath, output);
    console.log(`Report written to ${outputPath}`);
}

main().catch(console.error);
