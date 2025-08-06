import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

// These are the Base64 encoded fonts needed for jsPDF to show the correct fonts
// selected from the ContractPage / SignatureSelector
import GreatVibesBase64 from "@/assets/fonts/base64/GreatVibes";
import BilboSwashCapsBase64 from "@/assets/fonts/base64/BilboSwashCaps";
import LaBelleAuroreBase64 from "@/assets/fonts/base64/LaBelleAurore";
import OvertheRainbowBase64 from "@/assets/fonts/base64/OvertheRainbow";
import RougeScriptBase64 from "@/assets/fonts/base64/RougeScript";
import WhisperBase64 from "@/assets/fonts/base64/Whisper";

// Define the mapping between font names and their internal keys
const SIGNATURE_FONTS = [
  { name: "Great Vibes", fontKey: "GreatVibes", fontData: GreatVibesBase64 },
  { name: "Rouge Script", fontKey: "RougeScript", fontData: RougeScriptBase64 },
  { name: "Whisper", fontKey: "Whisper", fontData: WhisperBase64 },
  {
    name: "Over the Rainbow",
    fontKey: "OvertheRainbow",
    fontData: OvertheRainbowBase64,
  },
  {
    name: "La Belle Aurore",
    fontKey: "LaBelleAurore",
    fontData: LaBelleAuroreBase64,
  },
  {
    name: "Bilbo Swash Caps",
    fontKey: "BilboSwashCaps",
    fontData: BilboSwashCapsBase64,
  },
];

// Load and register fonts with jsPDF
const loadFontsIntoJsPDF = (pdf) => {
  try {
    // Add each font to the PDF's virtual file system and register it
    SIGNATURE_FONTS.forEach((font) => {
      const fontFileName = `${font.fontKey}-normal.ttf`;

      // Add the file to VFS with its base64 data
      pdf.addFileToVFS(fontFileName, font.fontData);

      // Register the font for use in the PDF
      pdf.addFont(fontFileName, font.fontKey, "normal");

      console.log(`Registered font: ${font.name}`);
    });

    return true;
  } catch (error) {
    console.error("Error loading fonts into jsPDF:", error);
    return false;
  }
};

// Function to extract font name from signatureData
const getSelectedFontName = (signatureData) => {
  if (!signatureData?.selectedFont?.font) return "helvetica";

  // Extract the font name from format like "'Great Vibes', cursive"
  const fontMatch =
    signatureData.selectedFont.font.match(/'([^']+)'/) ||
    signatureData.selectedFont.font.match(/"([^"]+)"/);

  return fontMatch ? fontMatch[1] : "helvetica";
};

// format it as dollars (two decimals) This is the base price for membership used in SYP Contract text
const getPriceString = (membershipPrice) => {
  return membershipPrice != null
    ? `$${Number(membershipPrice).toFixed(2)}`
    : "$115.00";
};

// Function to calculate cancellation date (14 days from start date)
const calculateCancellationDate = (startDate) => {
  if (!startDate) return "";
  try {
    // Parse the start date
    const date = new Date(startDate);
    if (isNaN(date.getTime())) return "";

    // Add 14 days to the start date
    date.setDate(date.getDate() + 14);

    // Format as MM/DD/YYYY
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  } catch (e) {
    console.error("Error calculating cancellation date:", e);
    return "";
  }
};

// Function to check if club is in New Mexico
const isNewMexicoClub = (selectedClub) => {
  return selectedClub?.state === "NM";
};

// Function to get tax rate for New Mexico clubs
const getTaxRate = (selectedClub) => {
  return isNewMexicoClub(selectedClub) ? 0.07625 : 0;
};

// Function to get club name
const getClubName = (selectedClub) => {
  return selectedClub?.name || "Wellbridge";
};

// Function to format date
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "";
  }
};

// Function to apply signature font
const applySignatureFont = (pdf, signatureData) => {
  if (signatureData?.selectedFont?.font) {
    const fontName = getSelectedFontName(signatureData);
    try {
      pdf.setFont(fontName, "normal");
      return true;
    } catch (error) {
      console.error("Error applying signature font:", error);
      pdf.setFont("helvetica", "normal");
      return false;
    }
  }
  return false;
};

// Function to format credit card number
const formatCreditCardNumber = (ccNumber) => {
  if (!ccNumber) return "";
  const cleaned = ccNumber.replace(/\s/g, "");
  const last4 = cleaned.slice(-4);
  return `************${last4}`;
};

// Function to draw paged text
function drawPagedText(
  pdf,
  lines,
  x,
  startY,
  lineHeight = 5,
  bottomMargin = 10
) {
  let currentY = startY;
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we need a new page
    if (currentY + lineHeight > pageHeight - bottomMargin) {
      pdf.addPage();
      currentY = 20; // Start from top of new page
    }

    pdf.text(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

// Function to format first of next month
function formatFirstOfNextMonthMMDDYYYY(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    // Set to first day of next month
    date.setMonth(date.getMonth() + 1);
    date.setDate(1);

    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  } catch (e) {
    console.error("Error formatting first of next month:", e);
    return "";
  }
}

// Main function to generate contract PDF and return buffer - COMPLETE VERSION FROM CanvasContractPDF
export const generateContractPDFBuffer = async (
  formData,
  signatureData,
  signatureDate,
  initialedSections,
  selectedClub,
  membershipPrice
) => {
  if (!formData || !signatureData) {
    throw new Error("Missing required data for PDF generation");
  }

  try {
    // Create new jsPDF instance
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    // Get the selected font name from signatureData
    const selectedFontName = getSelectedFontName(signatureData);
    console.log("Using font:", selectedFontName);

    // Load and register fonts for PDF
    const fontsLoaded = await loadFontsIntoJsPDF(pdf);
    console.log("Fonts loaded successfully:", fontsLoaded);

    // Set font styles
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    // Add title based on club type
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(getClubName(selectedClub), 105, 20, { align: "center" });
    pdf.text("Membership Agreement", 105, 30, { align: "center" });

    // Member Information Section
    const xStart = 20;
    const y = 45;

    // 1) Draw the prefix in your normal size
    pdf.setFontSize(10);
    const prefix = "Home Club: ";
    pdf.text(prefix, xStart, y);

    // measure how wide that was
    const prefixWidth = pdf.getTextWidth(prefix);

    // 2) Draw the club name larger
    const clubName =
      selectedClub?.shortName || selectedClub?.locationName || "";
    const clubFontSize = 14; // or whatever size you like
    pdf.setFontSize(clubFontSize);
    pdf.text(clubName, xStart + prefixWidth, y);

    // measure that width too
    const clubNameWidth = pdf.getTextWidth(clubName);

    // 3) Continue the rest of the line back at normal size
    pdf.setFontSize(10);
    const suffix = "          Membership Information - PRIMARY MEMBER";
    pdf.text(suffix, xStart + prefixWidth + clubNameWidth, y);

    // Primary Member details table - matches ContractPage layout
    autoTable(pdf, {
      startY: 50,
      head: [["Last Name", "First Name", "DOB"]],
      body: [
        [
          formData.lastName || "",
          formData.firstName || "",
          formatDate(formData.dob || formData.dateOfBirth) || "",
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      margin: { left: 20, right: 20 },
    });

    // Contact Information
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    const memberTableEndY = pdf.lastAutoTable.finalY;

    // Email row
    autoTable(pdf, {
      startY: memberTableEndY + 2,
      head: [["Phone Number", "Email"]],
      body: [
        [
          formData.mobilePhone || formData.cellPhone || "",
          formData.email || "",
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      margin: { left: 20, right: 20 },
    });

    // Address information
    const emailTableEndY = pdf.lastAutoTable.finalY;
    autoTable(pdf, {
      startY: emailTableEndY + 2,
      head: [["Home Address", "City", "State", "ZIP Code"]],
      body: [
        [
          formData.address || "",
          formData.city || "",
          formData.state || "",
          formData.zipCode || "",
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      margin: { left: 20, right: 20 },
    });

    // Legal Guardian Information Section - Only show for Junior Memberships
    const phoneTableEndY = pdf.lastAutoTable.finalY;
    let currentTableEndY = phoneTableEndY;

    if (formData.specialtyMembership === "J") {
      // Legal Guardian label
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("LEGAL GUARDIAN", 20, currentTableEndY + 7);

      // Legal Guardian details table - matches ContractPage layout
      autoTable(pdf, {
        startY: currentTableEndY + 10,
        head: [["Last Name", "First Name", "DOB", "Gender", "Relationship"]],
        body: [
          [
            formData.guardianLastName || "",
            formData.guardianFirstName || "",
            formatDate(formData.guardianDateOfBirth) || "",
            formData.guardianGender || "",
            formData.guardianRelationship
              ? formData.guardianRelationship.charAt(0).toUpperCase() +
                formData.guardianRelationship.slice(1).replace("_", " ")
              : "",
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [220, 220, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        margin: { left: 20, right: 20 },
      });

      // Guardian Email and Phone on same row
      const guardianTableEndY = pdf.lastAutoTable.finalY;
      autoTable(pdf, {
        startY: guardianTableEndY + 2,
        head: [["Email", "Phone"]],
        body: [[formData.guardianEmail || "", formData.guardianPhone || ""]],
        theme: "grid",
        headStyles: {
          fillColor: [220, 220, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        margin: { left: 20, right: 20 },
      });

      currentTableEndY = pdf.lastAutoTable.finalY;
    }

    // Membership details section
    autoTable(pdf, {
      startY: currentTableEndY + 5,
      head: [
        [
          "Membership Type",
          "Add-on Options",
          "Specialty Membership",
          "Agreement Type",
        ],
      ],
      body: [
        [
          formData.displayMembershipType || "Individual",
          formData.addOns && formData.addOns.length > 0
            ? formData.addOns.map((addon) => addon.trim()).join(", ")
            : "None",
          formData.displaySpecialtyMembership || "None",
          formData.displayAgreementType || "Month-to-month",
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [60, 60, 60],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      margin: { left: 20, right: 20 },
    });

    // Family Members Section (if applicable)
    const monthlyTableEndY = pdf.lastAutoTable.finalY;
    let currentY = monthlyTableEndY + 10;

    if (formData.familyMembers && formData.familyMembers.length > 0) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Family Members (${formData.familyMembers.length})`,
        20,
        currentY
      );

      // Debug output to see what's in familyMembers
      console.log("Family members data for PDF:", formData.familyMembers);

      // Create family members table with extended information
      const familyMembersData = formData.familyMembers.map((member) => {
        // Ensure all required properties exist, using different possible property names
        const name =
          member.name || `${member.firstName || ""} ${member.lastName || ""}`;
        const gender = member.gender || "";
        const type = member.type || member.memberType || "";
        const birthday = member.dateOfBirth
          ? formatDate(member.dateOfBirth)
          : "";

        console.log(
          `Processing member: ${name}, Gender: ${gender}, Type: ${type}, Birthday: ${birthday}`
        );

        return [name, gender, type, birthday];
      });

      autoTable(pdf, {
        startY: currentY + 5,
        head: [["Name", "Gender", "Type", "Date of Birth"]],
        body: familyMembersData,
        theme: "grid",
        headStyles: {
          fillColor: [200, 200, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        margin: { left: 20, right: 20 },
      });

      currentY = pdf.lastAutoTable.finalY + 5;
    }

    // Monthly Dues Section
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("MONTHLY DUES", 20, currentY);
    currentY += 7;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    // Calculate total monthly dues
    const monthlyDues = parseFloat(formData.monthlyDues || 0);
    const serviceAddons = formData.serviceAddons || [];
    const addonsTotal = serviceAddons.reduce(
      (sum, addon) => sum + parseFloat(addon.price || 0),
      0
    );

    // Calculate tax if applicable (New Mexico clubs)
    const isNewMexicoClub = selectedClub?.state === "NM";
    const taxRate = isNewMexicoClub ? formData.taxRate || 0.07625 : 0;
    const duesTax = isNewMexicoClub
      ? Number((monthlyDues * taxRate).toFixed(2))
      : 0;
    const addonsTax = isNewMexicoClub
      ? Number((addonsTotal * taxRate).toFixed(2))
      : 0;

    // Gross monthly total includes dues + addons + taxes
    const grossMonthlyTotal = monthlyDues + addonsTotal + duesTax + addonsTax;

    // Monthly dues table
    autoTable(pdf, {
      startY: currentY,
      head: [["Item", "Amount"]],
      body: [
        ["Monthly Dues", `$${monthlyDues.toFixed(2)}`],
        ...serviceAddons.map((addon) => [
          addon.name || addon.description || "Add-on",
          `$${parseFloat(addon.price || 0).toFixed(2)}`,
        ]),
        ...(isNewMexicoClub && duesTax > 0
          ? [["Tax on Dues", `$${duesTax.toFixed(2)}`]]
          : []),
        ...(isNewMexicoClub && addonsTax > 0
          ? [["Tax on Add-ons", `$${addonsTax.toFixed(2)}`]]
          : []),
        ["**TOTAL MONTHLY**", `$${grossMonthlyTotal.toFixed(2)}`],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [60, 60, 60],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      margin: { left: 20, right: 20 },
    });

    // Add page numbers to footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
    }

    // Return the PDF as an ArrayBuffer - same as download button
    return pdf.output("arraybuffer");
  } catch (error) {
    console.error("Error generating contract PDF buffer:", error);
    throw new Error(
      `Canvas PDF Generation Error: ${error.message || "Unknown error"}`
    );
  }
};
