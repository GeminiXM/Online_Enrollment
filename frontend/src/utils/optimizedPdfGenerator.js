import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

// Base64 encoded fonts
import GreatVibesBase64 from "@/assets/fonts/base64/GreatVibes";
import BilboSwashCapsBase64 from "@/assets/fonts/base64/BilboSwashCaps";
import LaBelleAuroreBase64 from "@/assets/fonts/base64/LaBelleAurore";
import OvertheRainbowBase64 from "@/assets/fonts/base64/OvertheRainbow";
import RougeScriptBase64 from "@/assets/fonts/base64/RougeScript";
import WhisperBase64 from "@/assets/fonts/base64/Whisper";

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

// Helper functions
const calculateCancellationDate = (startDate) => {
  if (!startDate) return "";
  try {
    const date = new Date(startDate);
    if (isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + 14);
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

const isNewMexicoClub = (selectedClub) => {
  return selectedClub?.state === "NM" || false;
};

const getClubName = (selectedClub) => {
  return isNewMexicoClub(selectedClub)
    ? "New Mexico Sports and Wellness"
    : "Colorado Athletic Club";
};

const getClubAbbreviation = (selectedClub) => {
  return isNewMexicoClub(selectedClub) ? "NMSW" : "CAC";
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const parts = dateString.split(/[-/T]/);
    if (parts.length >= 3) {
      let year, month, day;
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else {
        month = parseInt(parts[0], 10) - 1;
        day = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      }
      const date = new Date(year, month, day);
      return date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    }
    if (dateString.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) return dateString;
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    }
  } catch (e) {
    console.error("Error formatting date:", e);
  }
  return dateString;
};

const drawPagedText = (
  pdf,
  lines,
  x,
  startY,
  lineHeight = 5,
  bottomMargin = 10
) => {
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = startY;
  for (const line of lines) {
    if (y + lineHeight > pageHeight - bottomMargin) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(line, x, y);
    y += lineHeight;
  }
  return y;
};

// Load and register fonts with jsPDF
const loadFontsIntoJsPDF = (pdf) => {
  try {
    SIGNATURE_FONTS.forEach((font) => {
      const fontFileName = `${font.fontKey}-normal.ttf`;
      pdf.addFileToVFS(fontFileName, font.fontData);
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
  const fontMatch =
    signatureData.selectedFont.font.match(/'([^']+)'/) ||
    signatureData.selectedFont.font.match(/"([^"]+)"/);
  return fontMatch ? fontMatch[1] : "helvetica";
};

// Helper function to apply signature font to the document
const applySignatureFont = (pdf, signatureData) => {
  try {
    const fontName = getSelectedFontName(signatureData);
    console.log("Applying font:", fontName);
    let fontKey = "times";
    let fontSize = 16;
    if (fontName === "Great Vibes") {
      fontKey = "GreatVibes";
      fontSize = 12;
    } else if (fontName === "Rouge Script") {
      fontKey = "RougeScript";
      fontSize = 12;
    } else if (fontName === "Whisper") {
      fontKey = "Whisper";
      fontSize = 12;
    } else if (fontName === "Over the Rainbow") {
      fontKey = "OvertheRainbow";
      fontSize = 12;
    } else if (fontName === "La Belle Aurore") {
      fontKey = "LaBelleAurore";
      fontSize = 12;
    } else if (fontName === "Bilbo Swash Caps") {
      fontKey = "BilboSwashCaps";
      fontSize = 12;
    }
    if (fontKey !== "times") {
      pdf.setFont(fontKey, "normal");
    } else {
      pdf.setFont("times", "italic");
    }
    pdf.setFontSize(fontSize);
  } catch (error) {
    console.error("Error applying signature font:", error);
    pdf.setFont("times", "italic");
    pdf.setFontSize(16);
  }
};

// Complete PDF generation function that returns a Blob
export const generatePdfOnce = async (
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
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    await loadFontsIntoJsPDF(pdf);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    // Add title based on club type
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(getClubName(selectedClub), 105, 20, { align: "center" });
    pdf.text("Membership Agreement", 105, 30, { align: "center" });

    // Member Information Section
    pdf.setFontSize(14);
    pdf.text("Membership Information", 20, 45);

    // PRIMARY MEMBER SECTION
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("PRIMARY MEMBER", 20, 55);

    // Primary Member details table
    autoTable(pdf, {
      startY: 60,
      head: [["Last Name", "First Name", "DOB", "Gender"]],
      body: [
        [
          formData.lastName || "",
          formData.firstName || "",
          formatDate(formData.dob || formData.dateOfBirth) || "",
          formData.gender || "",
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
    pdf.text("E-mail", 20, memberTableEndY + 10);

    // Email row
    autoTable(pdf, {
      startY: memberTableEndY + 15,
      body: [[formData.email || ""]],
      theme: "grid",
      margin: { left: 20, right: 20 },
    });

    // Address information
    const emailTableEndY = pdf.lastAutoTable.finalY;
    autoTable(pdf, {
      startY: emailTableEndY + 5,
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

    // Phone information
    const addressTableEndY = pdf.lastAutoTable.finalY;
    autoTable(pdf, {
      startY: addressTableEndY + 5,
      head: [["Cell Phone", "Home Phone", "Work Phone"]],
      body: [
        [
          formData.mobilePhone || formData.cellPhone || "",
          formData.homePhone || "",
          formData.workPhone || "",
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

    // Membership details section
    const phoneTableEndY = pdf.lastAutoTable.finalY;
    autoTable(pdf, {
      startY: phoneTableEndY + 10,
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
            ? formData.addOns.join(", ")
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

    // Financial Information
    const membershipTableEndY = pdf.lastAutoTable.finalY;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Financial Details", 20, membershipTableEndY + 15);

    // Financial details table
    autoTable(pdf, {
      startY: membershipTableEndY + 20,
      head: [["Item", "Amount"]],
      body: [
        ["Initiation Fee", `$${formData.initiationFee || "19.00"}`],
        ["Pro-rated Dues", `$${formData.proratedDues || "0.00"}`],
        ["Pro-rated Add-Ons", `$${formData.proratedAddOns || "0.00"}`],
        ["Packages", `$${formData.packagesFee || "0.00"}`],
        ["Taxes", `$${formData.taxAmount || "0.00"}`],
        [
          "Total Collected (Tax included)",
          `$${formData.totalCollected || "0.00"}`,
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

    // Monthly Cost Going Forward
    const financialTableEndY = pdf.lastAutoTable.finalY;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Monthly Cost Going Forward", 20, financialTableEndY + 15);

    autoTable(pdf, {
      startY: financialTableEndY + 20,
      body: [
        [
          {
            content: `${formData.displayMembershipType || "Individual"} Dues ${
              formData.displayAgreementType || "Month-to-month"
            }`,
            styles: { fontStyle: "normal" },
          },
          {
            content: `$${formData.monthlyDues || "0.00"}`,
            styles: { fontStyle: "normal" },
          },
        ],
        [
          {
            content: "Total Monthly Membership Dues Rate",
            styles: { fontStyle: "normal" },
          },
          {
            content: `$${
              formData.totalMonthlyRate || formData.monthlyDues || "0.00"
            }`,
            styles: { fontStyle: "normal" },
          },
        ],
        [
          {
            content: "Membership Start Date",
            styles: { fontStyle: "normal" },
          },
          {
            content: formatDate(formData.requestedStartDate) || "",
            styles: { fontStyle: "bold" },
          },
        ],
      ],
      theme: "grid",
      margin: { left: 20, right: 20 },
    });

    // Add Terms and Conditions (simplified for brevity)
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Terms and Conditions", 105, 20, { align: "center" });

    // Add signature section
    pdf.addPage();
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("SIGNATURE", 20, 20);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const signatureText = `By signing below, I acknowledge that I have read and understand this agreement along with the terms and conditions contained in this document and agree to abide by the rules and regulations of ${getClubName(
      selectedClub
    )}.`;
    const splitSignatureText = pdf.splitTextToSize(signatureText, 170);
    pdf.text(splitSignatureText, 20, 30);

    if (signatureData?.signature?.text) {
      applySignatureFont(pdf, signatureData);
      pdf.setFontSize(22);
      pdf.text(signatureData.signature.text, 50, 60);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.line(40, 70, 100, 70);
      pdf.text("Member Signature", 60, 75);
    } else {
      pdf.line(40, 70, 100, 70);
      pdf.setFontSize(10);
      pdf.text("Member Signature", 60, 75);
    }

    if (signatureDate) {
      pdf.text(signatureDate, 150, 67);
    } else {
      pdf.line(140, 70, 180, 70);
    }
    pdf.line(140, 70, 180, 70);
    pdf.text("Date", 150, 75);

    // Add page numbers
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
    }

    // Return as Blob instead of ArrayBuffer
    return pdf.output("blob");
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error(
      `Canvas PDF Generation Error: ${error.message || "Unknown error"}`
    );
  }
};

// Function to save PDF Blob to server
export const savePdfToServer = async (pdfBlob, contractId, memberId) => {
  try {
    const response = await fetch("/api/save-contract-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        "X-Contract-Id": contractId,
        "X-Member-Id": memberId,
      },
      body: pdfBlob,
    });

    if (!response.ok) {
      throw new Error(
        `Server responded with ${response.status}: ${response.statusText}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error saving PDF to server:", error);
    throw error;
  }
};
