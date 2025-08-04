import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

// Import the font data
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

// Function to get club name
const getClubName = (selectedClub) => {
  return selectedClub?.name || selectedClub?.locationName || "Wellbridge";
};

// Function to check if club is in New Mexico
const isNewMexicoClub = (selectedClub) => {
  return selectedClub?.state === "NM";
};

// Function to get tax rate
const getTaxRate = (selectedClub) => {
  return isNewMexicoClub(selectedClub) ? 0.07625 : 0;
};

// Function to apply signature font
const applySignatureFont = (pdf, signatureData) => {
  const selectedFontName = getSelectedFontName(signatureData);

  // Find the font in our SIGNATURE_FONTS array
  const fontConfig = SIGNATURE_FONTS.find(
    (font) => font.name === selectedFontName
  );

  if (fontConfig) {
    pdf.setFont(fontConfig.fontKey, "normal");
  } else {
    pdf.setFont("helvetica", "normal");
  }
};

// Main function to generate contract PDF and return buffer
export const generateContractPDFBuffer = async (
  formData,
  signatureData,
  signatureDate,
  initialedSections,
  selectedClub,
  membershipPrice
) => {
  try {
    // Create new jsPDF instance
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

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
    const clubFontSize = 14;
    pdf.setFontSize(clubFontSize);
    pdf.text(clubName, xStart + prefixWidth, y);

    // measure that width too
    const clubNameWidth = pdf.getTextWidth(clubName);

    // 3) Continue the rest of the line back at normal size
    pdf.setFontSize(10);
    const suffix = "          Membership Information - PRIMARY MEMBER";
    pdf.text(suffix, xStart + prefixWidth + clubNameWidth, y);

    // Primary Member details table
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
      head: [["Address"]],
      body: [
        [
          `${formData.address || ""}${
            formData.address2 ? ", " + formData.address2 : ""
          }`,
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

    // City, State, ZIP
    const addressTableEndY = pdf.lastAutoTable.finalY;

    autoTable(pdf, {
      startY: addressTableEndY + 2,
      head: [["City", "State", "ZIP"]],
      body: [
        [formData.city || "", formData.state || "", formData.zipCode || ""],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      margin: { left: 20, right: 20 },
    });

    // Continue with the rest of the PDF generation...
    // (This is a simplified version - the full implementation would include all the contract content)

    // Add page numbers to footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
    }

    // Return the PDF as a buffer
    return pdf.output("arraybuffer");
  } catch (error) {
    console.error("Error generating contract PDF buffer:", error);
    throw new Error("Failed to generate contract PDF");
  }
};
