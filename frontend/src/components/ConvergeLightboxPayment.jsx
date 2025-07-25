import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import api from '../services/api.js';
import './ConvergeLightboxPayment.css';
import './SignatureSelector.css'; // Import Google Fonts for signatures

// Credit Card Logo SVGs
const CardLogos = {
  Visa: () => (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Visa"
    >
      <title>Visa</title>
      <path d="M17.445 8.623c-.387-.146-.99-.301-1.74-.301-1.92 0-3.275.968-3.285 2.355-.012 1.02.964 1.594 1.701 1.936.757.35 1.01.57 1.008.885-.005.477-.605.693-1.162.693-.766 0-1.186-.107-1.831-.375l-.239-.111-.271 1.598c.466.195 1.306.362 2.175.375 2.041 0 3.375-.961 3.391-2.439.016-.813-.51-1.43-1.621-1.938-.674-.33-1.094-.551-1.094-.886 0-.296.359-.612 1.109-.612.645-.01 1.096.129 1.455.273l.18.081.271-1.544-.047.01zm4.983-.17h-1.5c-.467 0-.816.127-1.021.591l-2.885 6.534h2.041l.408-1.07 2.49.002c.061.25.24 1.068.24 1.068H24l-1.572-7.125zM9.66 8.393h1.943l-1.215 7.129H8.444L9.66 8.391v.002zm-4.939 3.929l.202.99 1.901-4.859h2.059l-3.061 7.115H3.768l-1.68-6.026c-.035-.103-.078-.173-.18-.237C1.34 9.008.705 8.766 0 8.598l.025-.15h3.131c.424.016.766.15.883.604l.682 3.273v-.003zm15.308.727l.775-1.994c-.01.02.16-.412.258-.68l.133.615.449 2.057h-1.615v.002z"/>
    </svg>
  ),
  Mastercard: () => (
    <svg 
      width="36" 
      height="36" 
      viewBox="0 -54.25 482.51 482.51" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Mastercard</title>
      <g>
        <path d="M220.13,421.67V396.82c0-9.53-5.8-15.74-15.32-15.74-5,0-10.35,1.66-14.08,7-2.9-4.56-7-7-13.25-7a14.07,14.07,0,0,0-12,5.8v-5h-7.87v39.76h7.87V398.89c0-7,4.14-10.35,9.94-10.35s9.11,3.73,9.11,10.35v22.78h7.87V398.89c0-7,4.14-10.35,9.94-10.35s9.11,3.73,9.11,10.35v22.78Zm129.22-39.35h-14.5v-12H327v12h-8.28v7H327V408c0,9.11,3.31,14.5,13.25,14.5A23.17,23.17,0,0,0,351,419.6l-2.49-7a13.63,13.63,0,0,1-7.46,2.07c-4.14,0-6.21-2.49-6.21-6.63V389h14.5v-6.63Zm73.72-1.24a12.39,12.39,0,0,0-10.77,5.8v-5h-7.87v39.76h7.87V399.31c0-6.63,3.31-10.77,8.7-10.77a24.24,24.24,0,0,1,5.38.83l2.49-7.46a28,28,0,0,0-5.8-.83Zm-111.41,4.14c-4.14-2.9-9.94-4.14-16.15-4.14-9.94,0-16.15,4.56-16.15,12.43,0,6.63,4.56,10.35,13.25,11.6l4.14.41c4.56.83,7.46,2.49,7.46,4.56,0,2.9-3.31,5-9.53,5a21.84,21.84,0,0,1-13.25-4.14l-4.14,6.21c5.8,4.14,12.84,5,17,5,11.6,0,17.81-5.38,17.81-12.84,0-7-5-10.35-13.67-11.6l-4.14-.41c-3.73-.41-7-1.66-7-4.14,0-2.9,3.31-5,7.87-5,5,0,9.94,2.07,12.43,3.31Zm120.11,16.57c0,12,7.87,20.71,20.71,20.71,5.8,0,9.94-1.24,14.08-4.56l-4.14-6.21a16.74,16.74,0,0,1-10.35,3.73c-7,0-12.43-5.38-12.43-13.25S445,389,452.07,389a16.74,16.74,0,0,1,10.35,3.73l4.14-6.21c-4.14-3.31-8.28-4.56-14.08-4.56-12.43-.83-20.71,7.87-20.71,19.88h0Zm-55.5-20.71c-11.6,0-19.47,8.28-19.47,20.71s8.28,20.71,20.29,20.71a25.33,25.33,0,0,0,16.15-5.38l-4.14-5.8a19.79,19.79,0,0,1-11.6,4.14c-5.38,0-11.18-3.31-12-10.35h29.41v-3.31c0-12.43-7.46-20.71-18.64-20.71h0Zm-.41,7.46c5.8,0,9.94,3.73,10.35,9.94H364.68c1.24-5.8,5-9.94,11.18-9.94ZM268.59,401.79V381.91h-7.87v5c-2.9-3.73-7-5.8-12.84-5.8-11.18,0-19.47,8.7-19.47,20.71s8.28,20.71,19.47,20.71c5.8,0,9.94-2.07,12.84-5.8v5h7.87V401.79Zm-31.89,0c0-7.46,4.56-13.25,12.43-13.25,7.46,0,12,5.8,12,13.25,0,7.87-5,13.25-12,13.25-7.87.41-12.43-5.8-12.43-13.25Zm306.08-20.71a12.39,12.39,0,0,0-10.77,5.8v-5h-7.87v39.76H532V399.31c0-6.63,3.31-10.77,8.7-10.77a24.24,24.24,0,0,1,5.38.83l2.49-7.46a28,28,0,0,0-5.8-.83Zm-30.65,20.71V381.91h-7.87v5c-2.9-3.73-7-5.8-12.84-5.8-11.18,0-19.47,8.7-19.47,20.71s8.28,20.71,19.47,20.71c5.8,0,9.94-2.07,12.84-5.8v5h7.87V401.79Zm-31.89,0c0-7.46,4.56-13.25,12.43-13.25,7.46,0,12,5.8,12,13.25,0,7.87-5,13.25-12,13.25C564.73,415.46,560.17,409.25,560.17,401.79Z" transform="translate(-132.74 -48.5)"/>
        <g>
          <rect x="169.81" y="31.89" width="143.72" height="234.42" fill="#ff5f00"/>
          <path d="M317.05,197.6A149.5,149.5,0,0,1,373.79,80.39a149.1,149.1,0,1,0,0,234.42A149.5,149.5,0,0,1,317.05,197.6Z" transform="translate(-132.74 -48.5)" fill="#eb001b"/>
          <path d="M615.26,197.6a148.95,148.95,0,0,1-241,117.21,149.43,149.43,0,0,0,0-234.42,148.95,148.95,0,0,1,241,117.21Z" transform="translate(-132.74 -48.5)" fill="#f79e1b"/>
        </g>
      </g>
    </svg>
  ),
  Amex: () => (
    <svg 
      width="36" 
      height="36" 
      viewBox="0 -139.5 750 750" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>American Express</title>
      <g>
        <g fill-rule="nonzero">
          <rect fill="#2557D6" x="0" y="0" width="750" height="471" rx="40"></rect>
          <path d="M0.002688,221.18508 L36.026849,221.18508 L44.149579,201.67506 L62.334596,201.67506 L70.436042,221.18508 L141.31637,221.18508 L141.31637,206.26909 L147.64322,221.24866 L184.43894,221.24866 L190.76579,206.04654 L190.76579,221.18508 L366.91701,221.18508 L366.83451,189.15941 L370.2427,189.15941 C372.62924,189.24161 373.3263,189.46144 373.3263,193.38516 L373.3263,221.18508 L464.43232,221.18508 L464.43232,213.72973 C471.78082,217.6508 483.21064,221.18508 498.25086,221.18508 L536.57908,221.18508 L544.78163,201.67506 L562.96664,201.67506 L570.98828,221.18508 L644.84844,221.18508 L644.84844,202.65269 L656.0335,221.18508 L715.22061,221.18508 L715.22061,98.67789 L656.64543,98.67789 L656.64543,113.14614 L648.44288,98.67789 L588.33787,98.67789 L588.33787,113.14614 L580.80579,98.67789 L499.61839,98.67789 C486.02818,98.67789 474.08221,100.5669 464.43232,105.83121 L464.43232,98.67789 L408.40596,98.67789 L408.40596,105.83121 C402.26536,100.40529 393.89786,98.67789 384.59383,98.67789 L179.90796,98.67789 L166.17407,130.3194 L152.07037,98.67789 L87.59937,98.67789 L87.59937,113.14614 L80.516924,98.67789 L25.533518,98.67789 L-2.99999999e-06,156.92445 L-2.99999999e-06,221.18508 L0.002597,221.18508 L0.002688,221.18508 Z M227.39957,203.51436 L205.78472,203.51436 L205.70492,134.72064 L175.13228,203.51436 L156.62,203.51436 L125.96754,134.6597 L125.96754,203.51436 L83.084427,203.51436 L74.982981,183.92222 L31.083524,183.92222 L22.8996,203.51436 L4.7e-05,203.51436 L37.756241,115.67692 L69.08183,115.67692 L104.94103,198.84086 L104.94103,115.67692 L139.35289,115.67692 L166.94569,175.26406 L192.29297,115.67692 L227.39657,115.67692 L227.39657,203.51436 L227.39957,203.51436 Z M67.777214,165.69287 L53.346265,130.67606 L38.997794,165.69287 L67.777214,165.69287 Z M313.41947,203.51436 L242.98611,203.51436 L242.98611,115.67692 L313.41947,115.67692 L313.41947,133.96821 L264.07116,133.96821 L264.07116,149.8009 L312.23551,149.8009 L312.23551,167.80606 L264.07116,167.80606 L264.07116,185.34759 L313.41947,185.34759 L313.41947,203.51436 Z M412.67528,139.33321 C412.67528,153.33782 403.28877,160.57326 397.81863,162.74575 C402.43206,164.49434 406.37237,167.58351 408.24808,170.14281 C411.22525,174.51164 411.73875,178.41416 411.73875,186.25897 L411.73875,203.51436 L390.47278,203.51436 L390.39298,192.43732 C390.39298,187.1518 390.90115,179.55074 387.0646,175.32499 C383.98366,172.23581 379.28774,171.56552 371.69714,171.56552 L349.06363,171.56552 L349.06363,203.51436 L327.98125,203.51436 L327.98125,115.67692 L376.47552,115.67692 C387.25084,115.67692 395.18999,115.9604 402.00639,119.88413 C408.67644,123.80786 412.67529,129.53581 412.67529,139.33321 L412.67528,139.33321 Z M386.02277,152.37632 C383.1254,154.12756 379.69859,154.18584 375.59333,154.18584 L349.97998,154.18584 L349.97998,134.67583 L375.94186,134.67583 C379.61611,134.67583 383.44999,134.8401 385.94029,136.26016 C388.67536,137.53981 390.36749,140.26337 390.36749,144.02548 C390.36749,147.86443 388.75784,150.95361 386.02277,152.37632 Z M446.48908,203.51436 L424.97569,203.51436 L424.97569,115.67692 L446.48908,115.67692 L446.48908,203.51436 Z M696.22856,203.51436 L666.35032,203.51436 L626.38585,137.58727 L626.38585,203.51436 L583.44687,203.51436 L575.24166,183.92222 L531.44331,183.92222 L523.48287,203.51436 L498.81137,203.51436 C488.56284,203.51436 475.58722,201.25709 468.23872,193.79909 C460.82903,186.3411 456.97386,176.23903 456.97386,160.26593 C456.97386,147.23895 459.27791,135.33 468.33983,125.91941 C475.15621,118.90916 485.83044,115.67692 500.35982,115.67692 L520.77174,115.67692 L520.77174,134.49809 L500.78818,134.49809 C493.0938,134.49809 488.74909,135.63733 484.564,139.70147 C480.96957,143.4 478.50322,150.39171 478.50322,159.59829 C478.50322,169.00887 480.38158,175.79393 484.30061,180.22633 C487.5465,183.70232 493.445,184.75677 498.99495,184.75677 L508.46393,184.75677 L538.17987,115.67957 L569.77152,115.67957 L605.46843,198.76138 L605.46843,115.67957 L637.5709,115.67957 L674.6327,176.85368 L674.6327,115.67957 L696.22856,115.67957 L696.22856,203.51436 Z M568.07051,165.69287 L553.47993,130.67606 L538.96916,165.69287 L568.07051,165.69287 Z" fill="#FFFFFF"></path>
        </g>
      </g>
    </svg>
  ),
  Discover: () => (
    <svg 
      width="36" 
      height="36" 
      viewBox="0 -139.5 750 750" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Discover</title>
      <g>
        <g fill-rule="nonzero">
          <path d="M52.8771038,0 C23.6793894,0 -4.55476115e-15,23.1545612 0,51.7102589 L0,419.289737 C0,447.850829 23.671801,471 52.8771038,471 L697.122894,471 C726.320615,471 750,447.845433 750,419.289737 L750,252.475404 L750,51.7102589 C750,23.1491677 726.328202,-4.4533018e-15 697.122894,0 L52.8771038,0 Z" fill="#4D4D4D"></path>
          <path d="M314.569558,152.198414 C323.06625,152.198414 330.192577,153.9309 338.865308,158.110254 L338.865308,180.197198 C330.650269,172.563549 323.523875,169.368926 314.100058,169.368926 C295.577115,169.368926 281.009615,183.944539 281.009615,202.424438 C281.009615,221.911997 295.126279,235.620254 315.018404,235.620254 C323.972798,235.620254 330.967135,232.591128 338.865308,225.080186 L338.865308,247.178497 C329.883538,251.197965 322.604577,252.785079 314.100058,252.785079 C284.025202,252.785079 260.655798,230.849701 260.655798,202.560947 C260.655798,174.577103 284.647269,152.198414 314.569558,152.198414 Z M221.191404,152.807038 C232.293048,152.807038 242.451462,156.418802 250.944635,163.479831 L240.609981,176.340655 C235.465019,170.859895 230.599394,168.547945 224.682615,168.547945 C216.169885,168.547936 209.970327,173.154235 209.970327,179.215049 C209.970327,184.413218 213.450798,187.164422 225.302356,191.332621 C247.768529,199.141028 254.426462,206.064868 254.426462,221.354473 C254.426462,239.986821 240.026981,252.955721 219.503077,252.955721 C204.47426,252.955721 193.548154,247.330452 184.44824,234.636213 L197.205529,222.956624 C201.754702,231.315341 209.342452,235.792799 218.763144,235.792799 C227.573971,235.792799 234.097058,230.014421 234.097058,222.217168 C234.097058,218.175392 232.121269,214.709536 228.175702,212.259183 C226.189231,211.099073 222.254519,209.369382 214.522615,206.777734 C195.973058,200.43062 189.609,193.646221 189.609,180.386799 C189.609,164.636126 203.275981,152.807038 221.191404,152.807038 Z M446.886269,154.485036 L468.460788,154.485036 L495.464615,219.130417 L522.815885,154.485036 L544.22701,154.485036 L500.482644,253.198414 L489.855019,253.198414 L446.886269,154.485036 Z M64.8212135,154.632923 L93.811974,154.632923 C125.842394,154.632923 148.170827,174.418596 148.170827,202.822609 C148.170827,216.985567 141.340038,230.679389 129.788913,239.766893 C120.068962,247.437722 108.994192,250.877669 93.6598558,250.877669 L64.8212135,250.877669 L64.8212135,154.632923 Z M157.25849,154.632923 L177.009462,154.632923 L177.009462,250.877669 L157.25849,250.877669 L157.25849,154.632923 Z M553.156923,154.632923 L609.168423,154.632923 L609.168423,170.940741 L572.892875,170.940741 L572.892875,192.303392 L607.831279,192.303392 L607.831279,208.603619 L572.892875,208.603619 L572.892875,234.583122 L609.168423,234.583122 L609.168423,250.877669 L553.156923,250.877669 L553.156923,154.632923 Z M622.250596,154.632923 L651.534327,154.632923 C674.313452,154.632923 687.366663,165.030007 687.366663,183.048838 C687.366663,197.784414 679.179923,207.454847 664.302885,210.332805 L696.176385,250.877669 L671.888144,250.877669 L644.551904,212.213673 L641.977163,212.213673 L641.977163,250.877669 L622.250596,250.877669 L622.250596,154.632923 Z M641.977163,169.791736 L641.977163,198.939525 L647.748269,198.939525 C660.360308,198.939525 667.044769,193.734406 667.044769,184.05942 C667.044769,174.693052 660.359106,169.791736 648.060019,169.791736 L641.977163,169.791736 Z M84.5571663,170.940741 L84.5571663,234.583122 L89.8568962,234.583122 C102.619538,234.583122 110.679663,232.259105 116.885144,226.934514 C123.71575,221.152572 127.824519,211.920423 127.824519,202.684197 C127.824519,193.462833 123.71575,184.505917 116.885144,178.723975 C110.361615,173.113074 102.619538,170.940741 89.8568962,170.940741 L84.5571663,170.940741 Z" fill="#FFFFFF"></path>
          <path d="M399.164288,151.559424 C428.914452,151.559424 453.031096,173.727429 453.031096,201.112187 L453.031096,201.143399 C453.031096,228.528147 428.914452,250.727374 399.164288,250.727374 C369.414125,250.727374 345.297481,228.528147 345.297481,201.143399 L345.297481,201.112187 C345.297481,173.727429 369.414125,151.559424 399.164288,151.559424 Z M749.982612,271.093939 C724.934651,288.327133 537.408564,411.490963 212.719237,470.985071 L697.105507,470.985071 C726.303228,470.985071 749.982612,447.830504 749.982612,419.274807 L749.982612,271.093939 Z" fill="#F47216"></path>
        </g>
      </g>
    </svg>
  )
};

const ConvergeLightboxPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  
  // Data states
  const [formData, setFormData] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [initialedSections, setInitialedSections] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });
  
  // Payment states
  const [processorInfo, setProcessorInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState(''); // 'success' or 'error'
  
  // Get enrollment data and fetch payment processor info
  useEffect(() => {
    let currentFormData = null;
    
    // First, try to get data from location state (this should be the transformed data)
    if (location.state && location.state.formData) {
      currentFormData = location.state.formData;
      console.log('Using form data from location state');
      console.log('Location state family members:', currentFormData.familyMembers);
    }
    
    // If no location state data, try to get from localStorage (auto-saved data)
    if (!currentFormData) {
      try {
        const savedData = localStorage.getItem('enrollment_draft');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (parsedData.formData) {
            // For localStorage data, we need to transform it to include family members
            currentFormData = parsedData.formData;
            console.log('Using form data from localStorage (auto-saved)');
            
            // If this is raw form data from localStorage, we need to transform it
            // to include family members from the additional data
            if (parsedData.additionalData) {
              const familyMembers = [];
              
              // Add adult member if present
              if (parsedData.additionalData.adultMember && 
                  parsedData.additionalData.adultMember.firstName && 
                  parsedData.additionalData.adultMember.lastName) {
                familyMembers.push({
                  ...parsedData.additionalData.adultMember,
                  memberType: 'adult',
                  role: 'S'
                });
                console.log('Added adult member from additionalData:', parsedData.additionalData.adultMember.firstName);
              }
              
              // Add child member if present
              if (parsedData.additionalData.childMember && 
                  parsedData.additionalData.childMember.firstName && 
                  parsedData.additionalData.childMember.lastName) {
                familyMembers.push({
                  ...parsedData.additionalData.childMember,
                  memberType: 'child',
                  role: 'D'
                });
                console.log('Added child member from additionalData:', parsedData.additionalData.childMember.firstName);
              }
              
              // Add youth member if present
              if (parsedData.additionalData.youthMember && 
                  parsedData.additionalData.youthMember.firstName && 
                  parsedData.additionalData.youthMember.lastName) {
                familyMembers.push({
                  ...parsedData.additionalData.youthMember,
                  memberType: 'youth',
                  role: 'D'
                });
                console.log('Added youth member from additionalData:', parsedData.additionalData.youthMember.firstName);
              }
              
              // Add family members to the form data
              if (familyMembers.length > 0) {
                currentFormData.familyMembers = familyMembers;
                console.log('Added family members from additionalData:', familyMembers.length);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Error reading from localStorage:', error);
      }
    }
    
    // If still no data, redirect to enrollment form
    if (!currentFormData) {
      console.log('No form data found, redirecting to enrollment form');
      navigate('/enrollment');
      return;
    }
    
    // Set the form data
    setFormData(currentFormData);
    
    // Set customer info from form data
    setCustomerInfo({
      firstName: currentFormData.firstName || '',
      lastName: currentFormData.lastName || '',
      email: currentFormData.email || '',
      phone: currentFormData.phone || '',
      address: currentFormData.address || '',
      city: currentFormData.city || '',
      state: currentFormData.state || '',
      zipCode: currentFormData.zipCode || ''
    });
    
    // Set signature data if available
    if (location.state && location.state.signatureData) {
      setSignatureData(location.state.signatureData);
    }
    if (location.state && location.state.initialedSections) {
      setInitialedSections(location.state.initialedSections);
    }
    
    // Fetch the Converge processor info
    const fetchConvergeInfo = async () => {
      try {
        const clubId = currentFormData.club || selectedClub?.id || "001";
        console.log('Fetching Converge info for club:', clubId);
        
        // PRODUCTION DATA REQUIRED: 
        // This API call should retrieve real Converge credentials from your secure backend
        // These credentials should be stored securely and never exposed in client-side code
        const convergeResult = await api.getConvergeInfo(clubId);
        console.log('Converge API result:', convergeResult);
        
        if (convergeResult && convergeResult.success && convergeResult.convergeInfo) {
          console.log('Setting Converge processor info:', convergeResult.convergeInfo);
          setProcessorInfo(convergeResult.convergeInfo);
        } else {
          // PRODUCTION DATA REQUIRED: 
          // Replace these demo values with actual Converge credentials
          // For production, this fallback should either be removed or use environment-specific values
          setProcessorInfo({
            merchant_id: 'Demo Converge Merchant', // PRODUCTION: Your actual Converge Merchant ID
            converge_user_id: 'webuser',           // PRODUCTION: Your actual Converge User ID
            converge_pin: 'DEMO',                  // PRODUCTION: Your actual Converge PIN (keep secure)
            converge_url_process: 'https://api.demo.convergepay.com/VirtualMerchantDemo' // PRODUCTION: Use production URL
          });
        }
      } catch (error) {
        console.error('Error fetching Converge info:', error);
        // PRODUCTION: In production, consider more robust error handling or retry logic
        // These fallback values should be replaced with environment-specific values
        setProcessorInfo({
          merchant_id: 'Demo Converge Merchant (Fallback)', // PRODUCTION: Your actual Merchant ID
          converge_user_id: 'webuser',                      // PRODUCTION: Your actual User ID
          converge_pin: 'DEMO',                             // PRODUCTION: Your actual PIN (keep secure)
          converge_url_process: 'https://api.demo.convergepay.com/VirtualMerchantDemo' // PRODUCTION: Use production URL
        });
      }
    };
    
    fetchConvergeInfo();
  }, [location, navigate, selectedClub]);
  
  // Function to fetch a transaction token from the backend
  const fetchTransactionToken = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      
      console.log('Fetching transaction token with data:', {
        clubId: formData.club || selectedClub?.id || "001",
        amount: calculateProratedAmount().toFixed(2),
        invoiceNumber: `INV-${Date.now()}`,
        membershipId: formData.membershipDetails?.membershipId || "STD-MEMBERSHIP",
        customerInfo: customerInfo
      });
      
      // PRODUCTION DATA REQUIRED:
      // For production, implement a secure backend endpoint that generates a real transaction token
      // This endpoint should communicate with Converge securely, using proper authentication
      // The token generation should NEVER be done directly in the client-side code
      const response = await api.getConvergeToken({
        clubId: formData.club || selectedClub?.id || "001",
        amount: calculateProratedAmount().toFixed(2),
        // PRODUCTION: Generate a real invoice number, potentially from your database/ERP system
        invoiceNumber: `INV-${Date.now()}`, 
        membershipId: formData.membershipDetails?.membershipId || "STD-MEMBERSHIP",
        customerInfo: customerInfo
      });
      
      console.log('Transaction token response:', response);
      
      // PRODUCTION: Remove simulation code and implement proper error handling
      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to get transaction token');
      }
      
      console.log('Returning token:', response.ssl_txn_auth_token);
      return response.ssl_txn_auth_token;
    } catch (error) {
      console.error('Error fetching token:', error);
      setErrorMessage('Unable to start payment process. Please try again later.');
      setIsSubmitting(false);
      return null;
    }
  };
  
  // Demo mode state - true when in demo/simulation mode
  // PRODUCTION: Remove this demoMode state in production - always use the real integration
  const [demoMode, setDemoMode] = useState(true); // DEMO: Force demo mode for development

  // Cleanup event listener on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('message', handleLightboxResponse);
    };
  }, []);

  // Load the Converge script
  useEffect(() => {
    // Check if script is already loaded
    if (document.getElementById('converge-script')) {
      return;
    }
    
    // PRODUCTION DATA REQUIRED:
    // This entire simulation function should be REMOVED for production
    // Only the actual Converge integration should be used
    window.simulateConvergeLightbox = function(params) {
      console.log('DEMO MODE: Simulating Converge Lightbox with params:', params);
      
      // Create a simple simulation modal
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      modal.style.zIndex = '10000';
      modal.style.display = 'flex';
      modal.style.justifyContent = 'center';
      modal.style.alignItems = 'center';
      
      const content = document.createElement('div');
      content.style.width = '500px';
      content.style.backgroundColor = 'white';
      content.style.borderRadius = '8px';
      content.style.padding = '20px';
      content.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
      
      const header = document.createElement('div');
      header.style.borderBottom = '1px solid #ddd';
      header.style.paddingBottom = '10px';
      header.style.marginBottom = '15px';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      
      const title = document.createElement('h3');
      title.textContent = 'Demo Converge Payment';
      title.style.margin = '0';
      title.style.fontFamily = 'Arial, sans-serif';
      title.style.color = '#0275d8';
      
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.background = 'none';
      closeBtn.style.border = 'none';
      closeBtn.style.fontSize = '24px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.color = '#666';
      closeBtn.onclick = function() {
        document.body.removeChild(modal);
        
        // Simulate a canceled payment
        if (params.onCancel) {
          params.onCancel();
        }
      };
      
      header.appendChild(title);
      header.appendChild(closeBtn);
      
      const form = document.createElement('div');
      form.innerHTML = `
        <p style="margin-bottom: 20px; color: #666; font-family: Arial, sans-serif;">
          This is a demonstration of the Converge Lightbox payment. In a real implementation, 
          this would be a secure payment form from Converge.
        </p>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-family: Arial, sans-serif; font-size: 14px;">Card Number</label>
          <input type="text" value="4111 1111 1111 1111" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" readonly>
        </div>
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          <div style="flex: 1;">
            <label style="display: block; margin-bottom: 5px; font-family: Arial, sans-serif; font-size: 14px;">Expiry</label>
            <input type="text" value="12/25" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" readonly>
          </div>
          <div style="flex: 1;">
            <label style="display: block; margin-bottom: 5px; font-family: Arial, sans-serif; font-size: 14px;">CVV</label>
            <input type="text" value="123" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" readonly>
          </div>
        </div>
      `;
      
      const buttons = document.createElement('div');
      buttons.style.marginTop = '20px';
      buttons.style.display = 'flex';
      buttons.style.justifyContent = 'space-between';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.padding = '10px 15px';
      cancelBtn.style.borderRadius = '4px';
      cancelBtn.style.border = '1px solid #ddd';
      cancelBtn.style.background = '#f8f9fa';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.onclick = function() {
        document.body.removeChild(modal);
        
        // Simulate a canceled payment
        if (params.onCancel) {
          params.onCancel();
        } else {
          // Send a simulated message
          const event = new MessageEvent('message', {
            data: {
              ssl_result: '1',
              ssl_result_message: 'Payment canceled by user'
            },
            origin: 'https://api.convergepay.com'
          });
          window.dispatchEvent(event);
        }
      };
      
      const submitBtn = document.createElement('button');
      submitBtn.textContent = 'Submit Payment';
      submitBtn.style.padding = '10px 15px';
      submitBtn.style.borderRadius = '4px';
      submitBtn.style.border = 'none';
      submitBtn.style.background = '#0275d8';
      submitBtn.style.color = 'white';
      submitBtn.style.cursor = 'pointer';
      submitBtn.onclick = function() {
        document.body.removeChild(modal);
        
        // Simulate a successful payment
        setTimeout(() => {
          // Create a simulated response
          const event = new MessageEvent('message', {
            data: {
              ssl_result: '0',
              ssl_txn_id: `TXN-${Date.now()}`,
              ssl_approval_code: 'AUTH12345',
              ssl_card_number: '411111******1111',
              ssl_card_type: 'VISA',
              ssl_exp_date: '1225'
            },
            origin: 'https://api.convergepay.com'
          });
          window.dispatchEvent(event);
        }, 1000);
      };
      
      buttons.appendChild(cancelBtn);
      buttons.appendChild(submitBtn);
      
      content.appendChild(header);
      content.appendChild(form);
      content.appendChild(buttons);
      modal.appendChild(content);
      
      document.body.appendChild(modal);
    };
    
    // Define the global launchConvergeLightbox function that will either use the real
    // Converge Lightbox or our simulation function
    window.launchConvergeLightbox = function(params) {
      if (window.hostedPayments) {
        window.hostedPayments.launch(params);
      } else {
        // Use our simulation in demo mode
        window.simulateConvergeLightbox(params);
      }
    };
    
     // PRODUCTION DATA REQUIRED:
  // Load the correct Converge script based on environment
  const script = document.createElement('script');
  script.id = 'converge-script';
  
  // PRODUCTION: Change this to production URL
  // For production: https://api.convergepay.com/hosted-payments/PayWithConverge.js
  // For demo/testing: https://api.demo.convergepay.com/hosted-payments/PayWithConverge.js
  script.src = 'https://api.demo.convergepay.com/hosted-payments/PayWithConverge.js';
  script.async = true;
  script.onload = () => {
    console.log('Converge PayWithConverge script loaded successfully');
    // setDemoMode(false); // DEMO: Keep in demo mode - uncomment for production
  };
  script.onerror = () => {
    console.warn('Failed to load Converge script - using simulation mode instead');
    setDemoMode(true); // Fallback to simulation
  };
  
  document.body.appendChild(script);
  
  // Clean up on unmount
  return () => {
    const scriptElement = document.getElementById('converge-script');
    if (scriptElement) {
      document.body.removeChild(scriptElement);
    }
  };
}, []);
  
// Function to launch the Converge Lightbox
const launchLightbox = async () => {
  console.log('Launching Converge Lightbox...');
  
  // Get a transaction token from your server
  const token = await fetchTransactionToken();
  console.log('Got token:', token);
  
  if (!token) {
    console.log('No token received, returning early');
    return;
  }
  
  try {
    // Payment fields including billing information
    const paymentFields = {
      ssl_txn_auth_token: token,
      ssl_first_name: customerInfo.firstName,
      ssl_last_name: customerInfo.lastName,
      ssl_avs_address: customerInfo.address,
      ssl_city: customerInfo.city,
      ssl_state: customerInfo.state,
      ssl_avs_zip: customerInfo.zipCode,
      ssl_phone: customerInfo.phone,
      ssl_email: customerInfo.email
    };
    
    console.log('Payment fields:', paymentFields);
    console.log('Demo mode:', demoMode);
    
    if (demoMode) {
      console.log('Using demo/simulation mode for Converge Lightbox');
      
      // DEMO MODE: Set up postMessage listener for simulation
      // Remove any existing listener first to prevent duplicates
      window.removeEventListener('message', handleLightboxResponse);
      window.addEventListener('message', handleLightboxResponse, false);
      
      // Launch simulation
      console.log('Calling simulateConvergeLightbox...');
      window.simulateConvergeLightbox({
        paymentFields: paymentFields,
        onCancel: () => {
          console.log('Payment cancelled');
          setErrorMessage('Payment was cancelled.');
          setIsSubmitting(false);
        }
      });
    } else {
      console.log('Using real Converge Lightbox integration');
      
      // PRODUCTION: Use official Converge callback approach
      const callback = {
        onError: function (error) {
          console.error('Converge Lightbox error:', error);
          setErrorMessage('Payment system error. Please try again later.');
          setIsSubmitting(false);
        },
        onCancelled: function () {
          console.log('Payment cancelled by user');
          setErrorMessage('Payment was cancelled.');
          setIsSubmitting(false);
        },
        onDeclined: function (response) {
          console.log('Payment declined:', response);
          setPaymentResult({
            success: false,
            errorCode: response.ssl_result,
            errorMessage: response.ssl_result_message
          });
          setErrorMessage(response.ssl_result_message || 'Payment was declined. Please try again.');
          setIsSubmitting(false);
        },
        onApproval: function (response) {
          console.log('Payment approved:', response);
          setPaymentResult({
            success: true,
            transactionId: response.ssl_txn_id,
            authorizationCode: response.ssl_approval_code,
            cardNumber: response.ssl_card_number,
            cardType: response.ssl_card_type
          });
          
          setTimeout(() => {
            finishEnrollment(response);
          }, 3000);
        }
      };
      
      // PRODUCTION: Launch real Converge Lightbox using official method
      if (window.PayWithConverge) {
        window.PayWithConverge.open(paymentFields, callback);
      } else {
        throw new Error('PayWithConverge is not loaded');
      }
    }
    
  } catch (error) {
    console.error('Error launching Converge Lightbox:', error);
    setErrorMessage('Unable to launch payment form. Please try again later.');
    setIsSubmitting(false);
  }
};
  

// Handle the response from the Lightbox (DEMO MODE ONLY)
const handleLightboxResponse = (event) => {
  try {
    // PRODUCTION DATA REQUIRED:
    // This function is only used in demo mode
    // In production, responses come through the callback functions
    
    // PRODUCTION: Update origin validation for your environment
    // For production: 'https://api.convergepay.com'
    // For demo: 'https://api.demo.convergepay.com'
    const expectedOrigin = 'https://api.demo.convergepay.com';
    
    // Skip origin check in demo mode since it's simulated
    if (!demoMode && event.origin !== expectedOrigin) {
      return;
    }
    
    const response = event.data;
    console.log('Payment response received:', response);
    
    // Check if payment was successful
    if (response.ssl_result === '0') {
      // Payment successful
      const successResult = {
        success: true,
        transactionId: response.ssl_txn_id,
        authorizationCode: response.ssl_approval_code,
        cardNumber: response.ssl_card_number,
        cardType: response.ssl_card_type
      };
      
      console.log('Payment successful! Data to be sent to backend:', {
        transactionId: response.ssl_txn_id,
        authorizationCode: response.ssl_approval_code,
        last4: response.ssl_card_number?.slice(-4),
        cardType: response.ssl_card_type,
        expirationDate: response.ssl_exp_date || '1225'
      });
      
      setPaymentResult(successResult);
      setPopupType('success');
      setPopupMessage(`Payment successful! Transaction ID: ${response.ssl_txn_id}`);
      setShowResultPopup(true);
      
      // Wait a moment then process enrollment
      setTimeout(() => {
        setShowResultPopup(false);
        finishEnrollment(response);
      }, 3000);
      
    } else {
      // Payment failed
      const errorResult = {
        success: false,
        errorCode: response.ssl_result,
        errorMessage: response.ssl_result_message || 'Payment failed'
      };
      
      setPaymentResult(errorResult);
      setPopupType('error');
      setPopupMessage(`Payment failed: ${response.ssl_result_message || 'Unknown error'}`);
      setShowResultPopup(true);
      setIsSubmitting(false);
      
      // Auto-hide error popup after 5 seconds
      setTimeout(() => {
        setShowResultPopup(false);
      }, 5000);
    }
  } catch (error) {
    console.error('Error processing Converge response:', error);
    setErrorMessage('An error occurred while processing your payment. Please try again.');
    setIsSubmitting(false);
  }
};

// DEMO MODE: Simulate Converge Lightbox popup
const simulateConvergeLightbox = (config) => {
  console.log('simulateConvergeLightbox called with config:', config);
  console.log('simulateConvergeLightbox - formData:', formData);
  
  // Calculate the prorated amount before creating the modal
  const proratedAmount = calculateProratedAmount();
  console.log('simulateConvergeLightbox - calculated proratedAmount:', proratedAmount);
  
  // Create a modal popup for demo purposes
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background-color: white;
    border-radius: 8px;
    padding: 30px;
    max-width: 400px;
    width: 90%;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;
  
  content.innerHTML = `
    <h3>Converge Lightbox Payment (Demo)</h3>
    <p>Processing payment with Converge...</p>
    <div style="margin: 20px 0;">
      <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
    </div>
    <p><strong>Amount:</strong> $${proratedAmount.toFixed(2)}</p>
    <p><strong>Customer:</strong> ${customerInfo.firstName} ${customerInfo.lastName}</p>
    <button onclick="this.parentElement.parentElement.remove(); window.postMessage({ssl_result: '0', ssl_txn_id: 'DEMO_' + Date.now(), ssl_approval_code: 'DEMO123', ssl_card_number: '****1111', ssl_card_type: 'VISA', ssl_exp_date: '1225'}, '*');" style="background-color: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px;">Approve VISA</button>
    <button onclick="this.parentElement.parentElement.remove(); window.postMessage({ssl_result: '0', ssl_txn_id: 'DEMO_' + Date.now(), ssl_approval_code: 'DEMO123', ssl_card_number: '****2222', ssl_card_type: 'MASTERCARD', ssl_exp_date: '1230'}, '*');" style="background-color: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px;">Approve MC</button>
    <button onclick="this.parentElement.parentElement.remove(); window.postMessage({ssl_result: '0', ssl_txn_id: 'DEMO_' + Date.now(), ssl_approval_code: 'DEMO123', ssl_card_number: '****3333', ssl_card_type: 'AMEX', ssl_exp_date: '1228'}, '*');" style="background-color: #6f42c1; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px;">Approve AMEX</button>
    <button onclick="this.parentElement.parentElement.remove(); window.postMessage({ssl_result: '1', ssl_result_message: 'Card declined'}, '*');" style="background-color: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px;">Decline Payment</button>
    <button onclick="this.parentElement.parentElement.remove(); config.onCancel();" style="background-color: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px;">Cancel</button>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
  document.head.appendChild(style);
};

// Add the simulation function to window for demo mode
if (typeof window !== 'undefined') {
  window.simulateConvergeLightbox = simulateConvergeLightbox;
}
  
  // Complete enrollment after payment
  const finishEnrollment = async (paymentResult) => {
    try {
      // Extract card information from payment result
      const cardNumber = paymentResult.ssl_card_number || "";
      const last4 = cardNumber.slice(-4);
      const cardType = paymentResult.ssl_card_type || "";
      
      // For demo mode, we'll use a mock expiration date
      // In production, this would come from the actual payment response
      const expirationDate = paymentResult.ssl_exp_date || "1225"; // Demo: December 2025
      
      // Combine all data for submission
      const submissionData = {
        ...formData,
        // Add signature data
        signatureData: signatureData,
        // Add payment data
        paymentInfo: {
          processorName: 'CONVERGE',
          transactionId: paymentResult.ssl_txn_id,
          authorizationCode: paymentResult.ssl_approval_code,
          last4: last4,
          cardType: cardType,
          expirationDate: expirationDate
        }
      };
      
      console.log('Submitting enrollment data:', submissionData);
      
      // Log detailed information about what's being sent
      console.log('Enrollment submission details:', {
        primaryMember: {
          firstName: submissionData.firstName,
          lastName: submissionData.lastName,
          email: submissionData.email
        },
        familyMembers: submissionData.familyMembers ? submissionData.familyMembers.length : 0,
        guardian: submissionData.guardian ? 'Present' : 'None',
        paymentInfo: submissionData.paymentInfo,
        membershipDetails: submissionData.membershipDetails
      });
      
      if (submissionData.familyMembers && submissionData.familyMembers.length > 0) {
        console.log('Family members being submitted:', submissionData.familyMembers.map(m => ({
          name: `${m.firstName} ${m.lastName}`,
          role: m.role,
          memberType: m.memberType
        })));
        console.log('Raw family members data:', submissionData.familyMembers);
      }
      
      if (submissionData.guardian) {
        console.log('Guardian being submitted:', {
          name: `${submissionData.guardian.firstName} ${submissionData.guardian.lastName}`,
          relationship: submissionData.guardian.relationship
        });
      }
      
      // PRODUCTION DATA REQUIRED:
      // Ensure this posts to your actual production API endpoint
      // Add proper error handling, validation, and retry logic
      // Consider adding transaction logging for payment reconciliation
      const response = await api.post('/enrollment', submissionData);
      
// Debug logging before navigation
console.log('ConvergeLightboxPayment - About to navigate with:');
console.log('  formData:', formData);
console.log('  signatureData:', signatureData);
console.log('  initialedSections:', initialedSections);

// Calculate the amount being billed
const amountBilled = calculateProratedAmount();
console.log('ConvergeLightboxPayment - amountBilled being passed to confirmation:', amountBilled);

      // Navigate to confirmation page
      navigate('/enrollment-confirmation', { 
        state: { 
          enrollmentData: response.data,
          memberName: `${formData.firstName} ${formData.lastName}`,
          successMessage: `Welcome ${formData.firstName} ${formData.lastName} to ${selectedClub?.name || 'the club'}! You will use Membership# ${response.data.custCode} to take the next steps in your membership journey.`,
          paymentResponse: paymentResult,
          formData: formData,
          signatureData: signatureData,
          initialedSections: initialedSections,
          email: formData.email,
          amountBilled: amountBilled,
          membershipNumber: response.data.custCode,
          transactionId: response.data.transactionId
        } 
      });
    } catch (error) {
      console.error('Enrollment submission error:', error);
      setErrorMessage('Payment was processed successfully, but there was an error saving your enrollment. Please contact customer support.');
      setIsSubmitting(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    await launchLightbox();
  };
  
  // Calculate prorated amount due now
  const calculateProratedAmount = () => {
    console.log('calculateProratedAmount called with formData:', formData);
    if (!formData || !formData.membershipDetails) {
      console.log('calculateProratedAmount: formData or membershipDetails is missing');
      console.log('formData:', formData);
      console.log('membershipDetails:', formData?.membershipDetails);
      return 0;
    }
    
    // Get the prorated dues
    const proratedDues = formData.membershipDetails.proratedPrice || 0;
    
    // Get the prorated taxes
    const proratedTaxes = formData.membershipDetails.proratedTaxAmount || 0;
    
    // Calculate prorated addons from the service addons
    let proratedAddons = 0;
    if (formData.serviceAddons && formData.serviceAddons.length > 0) {
      formData.serviceAddons.forEach(addon => {
        if (addon.price) {
          // Calculate prorated factor based on start date
          const startDate = new Date(formData.requestedStartDate);
          const today = new Date();
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          const daysRemaining = daysInMonth - startDate.getDate() + 1;
          const proratedFactor = daysRemaining / daysInMonth;
          
          proratedAddons += parseFloat(addon.price) * proratedFactor;
        }
      });
    }
    
    // Calculate prorated addons from the child addons
    if (formData.childAddons && formData.childAddons.length > 0) {
      formData.childAddons.forEach(addon => {
        if (addon.price) {
          // Calculate prorated factor based on start date
          const startDate = new Date(formData.requestedStartDate);
          const today = new Date();
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          const daysRemaining = daysInMonth - startDate.getDate() + 1;
          const proratedFactor = daysRemaining / daysInMonth;
          
          proratedAddons += parseFloat(addon.price) * proratedFactor;
        }
      });
    }
    
    // Round to 2 decimal places
    const total = proratedDues + proratedAddons + proratedTaxes;
    
    console.log('calculateProratedAmount breakdown:', {
      proratedDues,
      proratedAddons,
      proratedTaxes,
      total: Math.round(total * 100) / 100
    });
    
    return Math.round(total * 100) / 100;
  };
  
  // Calculate monthly amount going forward
  const calculateMonthlyAmount = () => {
    if (!formData || !formData.membershipDetails) return 0;
    
    return formData.membershipDetails.price || 0;
  };
  
  if (!formData) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <div className="payment-container">
      {/* Payment Result Popup */}
      {showResultPopup && (
        <div className="popup-overlay">
          <div className={`popup-modal ${popupType}`}>
            <div className="popup-header">
              <h3>
                {popupType === 'success' ? (
                  <span className="success-icon">✅</span>
                ) : (
                  <span className="error-icon">❌</span>
                )}
                {popupType === 'success' ? 'Payment Successful!' : 'Payment Failed'}
              </h3>
              <button 
                className="popup-close" 
                onClick={() => setShowResultPopup(false)}
                aria-label="Close popup"
              >
                ×
              </button>
            </div>
            <div className="popup-content">
              <p>{popupMessage}</p>
              {popupType === 'success' && (
                <p className="popup-redirect-message">
                  Redirecting to confirmation page...
                </p>
              )}
            </div>
            {popupType === 'error' && (
              <div className="popup-actions">
                <button 
                  className="popup-button primary"
                  onClick={() => setShowResultPopup(false)}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <h1>Complete Your Membership with Converge</h1>
      
      {/* REMOVE THIS LINE - script is loaded dynamically */}
      {/* <script src="https://api.convergepay.com/hosted-payments/presentation.js"></script> */}
      
      <div className="payment-layout">
        <div className="payment-summary">
          <h2>Payment Summary</h2>
          
          {processorInfo && (
            <div className="processor-info">
              <h3>Converge Payment Information</h3>
              <div className="processor-details">
                <div className="processor-config">
                  <p className="detail-item">
                    <span className="detail-label">Merchant ID:</span>
                    <span className="detail-value">{processorInfo.merchant_id}</span>
                  </p>
                  <p className="detail-item">
                    <span className="detail-label">User ID:</span>
                    <span className="detail-value">{processorInfo.converge_user_id ? '✓ Configured' : '⚠️ Missing'}</span>
                  </p>
                  <p className="detail-item">
                    <span className="detail-label">Process URL:</span>
                    <span className="detail-value">{processorInfo.converge_url_process ? '✓ Configured' : '⚠️ Missing'}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="membership-summary">
            <h3>Membership Details</h3>
            <p className="membership-type">{formData.membershipDetails?.description || 'Standard Membership'}</p>
            <p className="membership-club">{selectedClub?.name || 'Club'}</p>
            
            <div className="price-details">
              <div className="price-row">
                <span className="price-label">Due today (prorated):</span>
                <span className="price-value">${calculateProratedAmount().toFixed(2)}</span>
              </div>
              <div className="price-row recurring">
                <span className="price-label">Monthly fee going forward:</span>
                <span className="price-value">${calculateMonthlyAmount().toFixed(2)}/month</span>
              </div>
            </div>
          </div>
          
          <div className="customer-info">
            <h3>Customer Information</h3>
            <div className="info-row">
              <span className="info-label">Name:</span>
              <span className="info-value">{customerInfo.firstName} {customerInfo.lastName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{customerInfo.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Phone:</span>
              <span className="info-value">{customerInfo.phone}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Address:</span>
              <span className="info-value">
                {customerInfo.address}, {customerInfo.city}, {customerInfo.state} {customerInfo.zipCode}
              </span>
            </div>
          </div>
          
          <div className="agreement-summary">
            <h3>Agreement</h3>
            <p>You have agreed to the membership terms and conditions with your electronic signature.</p>
            {signatureData?.signature && (
              <div className="signature-preview" style={{ 
                fontFamily: signatureData.selectedFont?.font || signatureData.signature?.font || 'inherit',
                fontSize: '2rem',
                lineHeight: '1.2'
              }}>
                {signatureData.signature?.text || ''}
              </div>
            )}
          </div>
        </div>
        
        <div className="payment-form-container">
          <h2>Payment Information</h2>
          
          <div className="lightbox-explainer">
            <h3>Converge Lightbox Payment {demoMode && <span style={{color: 'orange'}}>(DEMO MODE)</span>}</h3>
            <p>
              When you click the "Pay Now" button below, a secure payment form will appear where 
              you can safely enter your credit card information. Your payment will be processed securely 
              by Converge, our payment processor.
            </p>
            
            <div className="credit-card-logos">
              <div><CardLogos.Visa /></div>
              <div><CardLogos.Mastercard /></div>
              <div><CardLogos.Amex /></div>
              <div><CardLogos.Discover /></div>
            </div>
            
            {errorMessage && (
              <div className="error-message payment-error">
                {errorMessage}
              </div>
            )}
            
            {paymentResult && paymentResult.success && (
              <div className="success-message">
                <h3>Payment Successful! ✅</h3>
                <p>Transaction ID: {paymentResult.transactionId}</p>
                <p>Card: {paymentResult.cardType} ending in {paymentResult.cardNumber?.slice(-4)}</p>
                <p>Processing your enrollment...</p>
              </div>
            )}
            
            {paymentResult && !paymentResult.success && (
              <div className="error-message">
                <h3>Payment Failed ❌</h3>
                <p>Error: {paymentResult.errorMessage}</p>
                <p>Please try again or use a different payment method.</p>
              </div>
            )}
            
            <div className="form-actions">
              <button 
                type="button" 
                className="secondary-button"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
              >
                Back
              </button>
              <button 
                type="button" 
                className="primary-button"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Pay with Converge"}
              </button>
            </div>
            
            <div className="payment-security-notice">
              <p>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Your payment information is secure and encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConvergeLightboxPayment;
