import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import api from '../services/api.js';
//import PaymentProcessorDemo from './PaymentProcessorDemo';
import { generateContractPDFBuffer } from '../utils/contractPDFGenerator.js';
import './PaymentPage.css';

// Import Google Fonts for signatures (same as SignatureSelector)
import '../components/SignatureSelector.css';


// Credit Card Logo SVGs - Real card brand logos 
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
<svg width="800px" height="800px" viewBox="0 -54.25 482.51 482.51" id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg">
  <title>mastercard</title>
  <g>
    <path d="M220.13,421.67V396.82c0-9.53-5.8-15.74-15.32-15.74-5,0-10.35,1.66-14.08,7-2.9-4.56-7-7-13.25-7a14.07,14.07,0,0,0-12,5.8v-5h-7.87v39.76h7.87V398.89c0-7,4.14-10.35,9.94-10.35s9.11,3.73,9.11,10.35v22.78h7.87V398.89c0-7,4.14-10.35,9.94-10.35s9.11,3.73,9.11,10.35v22.78Zm129.22-39.35h-14.5v-12H327v12h-8.28v7H327V408c0,9.11,3.31,14.5,13.25,14.5A23.17,23.17,0,0,0,351,419.6l-2.49-7a13.63,13.63,0,0,1-7.46,2.07c-4.14,0-6.21-2.49-6.21-6.63V389h14.5v-6.63Zm73.72-1.24a12.39,12.39,0,0,0-10.77,5.8v-5h-7.87v39.76h7.87V399.31c0-6.63,3.31-10.77,8.7-10.77a24.24,24.24,0,0,1,5.38.83l2.49-7.46a28,28,0,0,0-5.8-.83Zm-111.41,4.14c-4.14-2.9-9.94-4.14-16.15-4.14-9.94,0-16.15,4.56-16.15,12.43,0,6.63,4.56,10.35,13.25,11.6l4.14.41c4.56.83,7.46,2.49,7.46,4.56,0,2.9-3.31,5-9.53,5a21.84,21.84,0,0,1-13.25-4.14l-4.14,6.21c5.8,4.14,12.84,5,17,5,11.6,0,17.81-5.38,17.81-12.84,0-7-5-10.35-13.67-11.6l-4.14-.41c-3.73-.41-7-1.66-7-4.14,0-2.9,3.31-5,7.87-5,5,0,9.94,2.07,12.43,3.31Zm120.11,16.57c0,12,7.87,20.71,20.71,20.71,5.8,0,9.94-1.24,14.08-4.56l-4.14-6.21a16.74,16.74,0,0,1-10.35,3.73c-7,0-12.43-5.38-12.43-13.25S445,389,452.07,389a16.74,16.74,0,0,1,10.35,3.73l4.14-6.21c-4.14-3.31-8.28-4.56-14.08-4.56-12.43-.83-20.71,7.87-20.71,19.88h0Zm-55.5-20.71c-11.6,0-19.47,8.28-19.47,20.71s8.28,20.71,20.29,20.71a25.33,25.33,0,0,0,16.15-5.38l-4.14-5.8a19.79,19.79,0,0,1-11.6,4.14c-5.38,0-11.18-3.31-12-10.35h29.41v-3.31c0-12.43-7.46-20.71-18.64-20.71h0Zm-.41,7.46c5.8,0,9.94,3.73,10.35,9.94H364.68c1.24-5.8,5-9.94,11.18-9.94ZM268.59,401.79V381.91h-7.87v5c-2.9-3.73-7-5.8-12.84-5.8-11.18,0-19.47,8.7-19.47,20.71s8.28,20.71,19.47,20.71c5.8,0,9.94-2.07,12.84-5.8v5h7.87V401.79Zm-31.89,0c0-7.46,4.56-13.25,12.43-13.25,7.46,0,12,5.8,12,13.25,0,7.87-5,13.25-12,13.25-7.87.41-12.43-5.8-12.43-13.25Zm306.08-20.71a12.39,12.39,0,0,0-10.77,5.8v-5h-7.87v39.76H532V399.31c0-6.63,3.31-10.77,8.7-10.77a24.24,24.24,0,0,1,5.38.83l2.49-7.46a28,28,0,0,0-5.8-.83Zm-30.65,20.71V381.91h-7.87v5c-2.9-3.73-7-5.8-12.84-5.8-11.18,0-19.47,8.7-19.47,20.71s8.28,20.71,19.47,20.71c5.8,0,9.94-2.07,12.84-5.8v5h7.87V401.79Zm-31.89,0c0-7.46,4.56-13.25,12.43-13.25,7.46,0,12,5.8,12,13.25,0,7.87-5,13.25-12,13.25-7.87.41-12.43-5.8-12.43-13.25Zm111.83,0V366.17h-7.87v20.71c-2.9-3.73-7-5.8-12.84-5.8-11.18,0-19.47,8.7-19.47,20.71s8.28,20.71,19.47,20.71c5.8,0,9.94-2.07,12.84-5.8v5h7.87V401.79Zm-31.89,0c0-7.46,4.56-13.25,12.43-13.25,7.46,0,12,5.8,12,13.25,0,7.87-5,13.25-12,13.25C564.73,415.46,560.17,409.25,560.17,401.79Z" transform="translate(-132.74 -48.5)"/>
    <g>
      <rect x="169.81" y="31.89" width="143.72" height="234.42" fill="#ff5f00"/>
      <path d="M317.05,197.6A149.5,149.5,0,0,1,373.79,80.39a149.1,149.1,0,1,0,0,234.42A149.5,149.5,0,0,1,317.05,197.6Z" transform="translate(-132.74 -48.5)" fill="#eb001b"/>
      <path d="M615.26,197.6a148.95,148.95,0,0,1-241,117.21,149.43,149.43,0,0,0,0-234.42,148.95,148.95,0,0,1,241,117.21Z" transform="translate(-132.74 -48.5)" fill="#f79e1b"/>
    </g>
  </g>
</svg>
  ),
  Amex: () => (
      <svg width="800px" height="800px" viewBox="0 -139.5 750 750" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <g id="amex" fill-rule="nonzero">
                  <rect id="Rectangle-1" fill="#2557D6" x="0" y="0" width="750" height="471" rx="40">

      </rect>
                  <path d="M0.002688,221.18508 L36.026849,221.18508 L44.149579,201.67506 L62.334596,201.67506 L70.436042,221.18508 L141.31637,221.18508 L141.31637,206.26909 L147.64322,221.24866 L184.43894,221.24866 L190.76579,206.04654 L190.76579,221.18508 L366.91701,221.18508 L366.83451,189.15941 L370.2427,189.15941 C372.62924,189.24161 373.3263,189.46144 373.3263,193.38516 L373.3263,221.18508 L464.43232,221.18508 L464.43232,213.72973 C471.78082,217.6508 483.21064,221.18508 498.25086,221.18508 L536.57908,221.18508 L544.78163,201.67506 L562.96664,201.67506 L570.98828,221.18508 L644.84844,221.18508 L644.84844,202.65269 L656.0335,221.18508 L715.22061,221.18508 L715.22061,98.67789 L656.64543,98.67789 L656.64543,113.14614 L648.44288,98.67789 L588.33787,98.67789 L588.33787,113.14614 L580.80579,98.67789 L499.61839,98.67789 C486.02818,98.67789 474.08221,100.5669 464.43232,105.83121 L464.43232,98.67789 L408.40596,98.67789 L408.40596,105.83121 C402.26536,100.40529 393.89786,98.67789 384.59383,98.67789 L179.90796,98.67789 L166.17407,130.3194 L152.07037,98.67789 L87.59937,98.67789 L87.59937,113.14614 L80.516924,98.67789 L25.533518,98.67789 L-2.99999999e-06,156.92445 L-2.99999999e-06,221.18508 L0.002597,221.18508 L0.002688,221.18508 Z M227.39957,203.51436 L205.78472,203.51436 L205.70492,134.72064 L175.13228,203.51436 L156.62,203.51436 L125.96754,134.6597 L125.96754,203.51436 L83.084427,203.51436 L74.982981,183.92222 L31.083524,183.92222 L22.8996,203.51436 L4.7e-05,203.51436 L37.756241,115.67692 L69.08183,115.67692 L104.94103,198.84086 L104.94103,115.67692 L139.35289,115.67692 L166.94569,175.26406 L192.29297,115.67692 L227.39657,115.67692 L227.39657,203.51436 L227.39957,203.51436 Z M67.777214,165.69287 L53.346265,130.67606 L38.997794,165.69287 L67.777214,165.69287 Z M313.41947,203.51436 L242.98611,203.51436 L242.98611,115.67692 L313.41947,115.67692 L313.41947,133.96821 L264.07116,133.96821 L264.07116,149.8009 L312.23551,149.8009 L312.23551,167.80606 L264.07116,167.80606 L264.07116,185.34759 L313.41947,185.34759 L313.41947,203.51436 Z M412.67528,139.33321 C412.67528,153.33782 403.28877,160.57326 397.81863,162.74575 C402.43206,164.49434 406.37237,167.58351 408.24808,170.14281 C411.22525,174.51164 411.73875,178.41416 411.73875,186.25897 L411.73875,203.51436 L390.47278,203.51436 L390.39298,192.43732 C390.39298,187.1518 390.90115,179.55074 387.0646,175.32499 C383.98366,172.23581 379.28774,171.56552 371.69714,171.56552 L349.06363,171.56552 L349.06363,203.51436 L327.98125,203.51436 L327.98125,115.67692 L376.47552,115.67692 C387.25084,115.67692 395.18999,115.9604 402.00639,119.88413 C408.67644,123.80786 412.67529,129.53581 412.67529,139.33321 L412.67528,139.33321 Z M386.02277,152.37632 C383.1254,154.12756 379.69859,154.18584 375.59333,154.18584 L349.97998,154.18584 L349.97998,134.67583 L375.94186,134.67583 C379.61611,134.67583 383.44999,134.8401 385.94029,136.26016 C388.67536,137.53981 390.36749,140.26337 390.36749,144.02548 C390.36749,147.86443 388.75784,150.95361 386.02277,152.37632 Z M446.48908,203.51436 L424.97569,203.51436 L424.97569,115.67692 L446.48908,115.67692 L446.48908,203.51436 Z M696.22856,203.51436 L666.35032,203.51436 L626.38585,137.58727 L626.38585,203.51436 L583.44687,203.51436 L575.24166,183.92222 L531.44331,183.92222 L523.48287,203.51436 L498.81137,203.51436 C488.56284,203.51436 475.58722,201.25709 468.23872,193.79909 C460.82903,186.3411 456.97386,176.23903 456.97386,160.26593 C456.97386,147.23895 459.27791,135.33 468.33983,125.91941 C475.15621,118.90916 485.83044,115.67692 500.35982,115.67692 L520.77174,115.67692 L520.77174,134.49809 L500.78818,134.49809 C493.0938,134.49809 488.74909,135.63733 484.564,139.70147 C480.96957,143.4 478.50322,150.39171 478.50322,159.59829 C478.50322,169.00887 480.38158,175.79393 484.30061,180.22633 C487.5465,183.70232 493.445,184.75677 498.99495,184.75677 L508.46393,184.75677 L538.17987,115.67957 L569.77152,115.67957 L605.46843,198.76138 L605.46843,115.67957 L637.5709,115.67957 L674.6327,176.85368 L674.6327,115.67957 L696.22856,115.67957 L696.22856,203.51436 Z M568.07051,165.69287 L553.47993,130.67606 L538.96916,165.69287 L568.07051,165.69287 Z" id="Path" fill="#FFFFFF">

      </path>
                  <path d="M749.95644,343.76716 C744.83485,351.22516 734.85504,355.00582 721.34464,355.00582 L680.62723,355.00582 L680.62723,336.1661 L721.17969,336.1661 C725.20248,336.1661 728.01736,335.63887 729.71215,333.99096 C731.18079,332.63183 732.2051,330.65804 732.2051,328.26036 C732.2051,325.70107 731.18079,323.66899 729.62967,322.45028 C728.09984,321.10969 725.87294,320.50033 722.20135,320.50033 C702.40402,319.83005 677.70592,321.10969 677.70592,293.30714 C677.70592,280.56363 685.83131,267.14983 707.95664,267.14983 L749.95379,267.14983 L749.95644,249.66925 L710.93382,249.66925 C699.15812,249.66925 690.60438,252.47759 684.54626,256.84375 L684.54626,249.66925 L626.83044,249.66925 C617.60091,249.66925 606.76706,251.94771 601.64279,256.84375 L601.64279,249.66925 L498.57751,249.66925 L498.57751,256.84375 C490.37496,250.95154 476.53466,249.66925 470.14663,249.66925 L402.16366,249.66925 L402.16366,256.84375 C395.67452,250.58593 381.24357,249.66925 372.44772,249.66925 L296.3633,249.66925 L278.95252,268.43213 L262.64586,249.66925 L148.99149,249.66925 L148.99149,372.26121 L260.50676,372.26121 L278.447,353.20159 L295.34697,372.26121 L364.08554,372.32211 L364.08554,343.48364 L370.84339,343.48364 C379.96384,343.62405 390.72054,343.25845 400.21079,339.17311 L400.21079,372.25852 L456.90762,372.25852 L456.90762,340.30704 L459.64268,340.30704 C463.13336,340.30704 463.47657,340.45011 463.47657,343.92344 L463.47657,372.25587 L635.71144,372.25587 C646.64639,372.25587 658.07621,369.46873 664.40571,364.41107 L664.40571,372.25587 L719.03792,372.25587 C730.40656,372.25587 741.50913,370.66889 749.95644,366.60475 L749.95644,343.76712 L749.95644,343.76716 Z M408.45301,296.61266 C408.45301,321.01872 390.16689,326.05784 371.7371,326.05784 L345.42935,326.05784 L345.42935,355.52685 L304.44855,355.52685 L278.48667,326.44199 L251.5058,355.52685 L167.9904,355.52685 L167.9904,267.66822 L252.79086,267.66822 L278.73144,296.46694 L305.55002,267.66822 L372.92106,267.66822 C389.6534,267.66822 408.45301,272.28078 408.45301,296.61266 Z M240.82781,337.04655 L188.9892,337.04655 L188.9892,319.56596 L235.27785,319.56596 L235.27785,301.64028 L188.9892,301.64028 L188.9892,285.66718 L241.84947,285.66718 L264.91132,311.27077 L240.82781,337.04655 Z M324.3545,347.10668 L291.9833,311.3189 L324.3545,276.6677 L324.3545,347.10668 Z M372.2272,308.04117 L344.98027,308.04117 L344.98027,285.66718 L372.47197,285.66718 C380.08388,285.66718 385.36777,288.75636 385.36777,296.43956 C385.36777,304.03796 380.32865,308.04117 372.2272,308.04117 Z M514.97053,267.66815 L585.34004,267.66815 L585.34004,285.83764 L535.96778,285.83764 L535.96778,301.81074 L584.1348,301.81074 L584.1348,319.73642 L535.96778,319.73642 L535.96778,337.21701 L585.34004,337.29641 L585.34004,355.52678 L514.97053,355.52678 L514.97053,267.66815 Z M487.91724,314.6973 C492.61049,316.42205 496.44703,319.51387 498.24559,322.07317 C501.22276,326.36251 501.65378,330.36571 501.73891,338.10985 L501.73891,355.52685 L480.5714,355.52685 L480.5714,344.53458 C480.5714,339.24908 481.08223,331.42282 477.1632,327.33748 C474.08226,324.19002 469.38635,323.4376 461.69463,323.4376 L439.16223,323.4376 L439.16223,355.52685 L417.97609,355.52685 L417.97609,267.66822 L466.65393,267.66822 C477.32816,267.66822 485.10236,268.13716 492.02251,271.81449 C498.6766,275.8177 502.86168,281.30191 502.86168,291.3245 C502.85868,305.34765 493.46719,312.50362 487.91724,314.6973 Z M475.99899,303.59022 C473.17879,305.25668 469.69077,305.39975 465.58817,305.39975 L439.97483,305.39975 L439.97483,285.66718 L465.9367,285.66718 C469.69077,285.66718 473.4475,285.74658 475.99899,287.25416 C478.7314,288.67687 480.36499,291.39779 480.36499,295.15725 C480.36499,298.91672 478.7314,301.94496 475.99899,303.59022 Z M666.33539,309.1866 C670.44067,313.41766 672.64095,318.7588 672.64095,327.80112 C672.64095,346.70178 660.78278,355.5242 639.51948,355.5242 L598.45353,355.5242 L598.45353,336.68449 L639.35453,336.68449 C643.35337,336.68449 646.18954,336.15726 647.9668,334.50934 C649.41681,333.15021 650.45709,331.17643 650.45709,328.77875 C650.45709,326.21944 649.33167,324.18738 647.88433,322.96866 C646.27201,321.62807 644.04778,321.01872 640.37619,321.01872 C620.65868,320.34843 595.9659,321.62807 595.9659,293.82551 C595.9659,281.08201 604.00615,267.66822 626.11019,267.66822 L668.37872,267.66822 L668.37872,286.36752 L629.70196,286.36752 C625.86809,286.36752 623.37512,286.51059 621.25464,287.9545 C618.94527,289.37721 618.08856,291.48876 618.08856,294.2759 C618.08856,297.59028 620.04941,299.8449 622.702,300.81987 C624.92624,301.59084 627.31543,301.81603 630.9072,301.81603 L642.25722,302.12071 C653.703,302.39889 661.55967,304.37003 666.33539,309.1866 Z M750,285.66718 L711.57335,285.66718 C707.7368,285.66718 705.18797,285.81025 703.04088,287.25416 C700.81665,288.67687 699.95995,290.78843 699.95995,293.57558 C699.95995,296.88994 701.83831,299.14456 704.57071,300.11953 C706.79495,300.8905 709.18415,301.1157 712.6961,301.1157 L724.12327,301.42038 C735.65419,301.70387 743.35123,303.67765 748.04448,308.49157 C748.89852,309.16186 749.41202,309.91428 750,310.6667 L750,285.66718 Z" id="path13" fill="#FFFFFF">

      </path>
              </g>
          </g>
      </svg>
  ),
  Discover: () => (

      <svg width="800px" height="800px" viewBox="0 -139.5 750 750" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <g id="discover" fill-rule="nonzero">
                  <path d="M52.8771038,0 C23.6793894,0 -4.55476115e-15,23.1545612 0,51.7102589 L0,419.289737 C0,447.850829 23.671801,471 52.8771038,471 L697.122894,471 C726.320615,471 750,447.845433 750,419.289737 L750,252.475404 L750,51.7102589 C750,23.1491677 726.328202,-4.4533018e-15 697.122894,0 L52.8771038,0 Z" id="Shape" fill="#4D4D4D">

      </path>
                  <path d="M314.569558,152.198414 C323.06625,152.198414 330.192577,153.9309 338.865308,158.110254 L338.865308,180.197198 C330.650269,172.563549 323.523875,169.368926 314.100058,169.368926 C295.577115,169.368926 281.009615,183.944539 281.009615,202.424438 C281.009615,221.911997 295.126279,235.620254 315.018404,235.620254 C323.972798,235.620254 330.967135,232.591128 338.865308,225.080186 L338.865308,247.178497 C329.883538,251.197965 322.604577,252.785079 314.100058,252.785079 C284.025202,252.785079 260.655798,230.849701 260.655798,202.560947 C260.655798,174.577103 284.647269,152.198414 314.569558,152.198414 Z M221.191404,152.807038 C232.293048,152.807038 242.451462,156.418802 250.944635,163.479831 L240.609981,176.340655 C235.465019,170.859895 230.599394,168.547945 224.682615,168.547945 C216.169885,168.547936 209.970327,173.154235 209.970327,179.215049 C209.970327,184.413218 213.450798,187.164422 225.302356,191.332621 C247.768529,199.141028 254.426462,206.064868 254.426462,221.354473 C254.426462,239.986821 240.026981,252.955721 219.503077,252.955721 C204.47426,252.955721 193.548154,247.330452 184.44824,234.636213 L197.205529,222.956624 C201.754702,231.315341 209.342452,235.792799 218.763144,235.792799 C227.573971,235.792799 234.097058,230.014421 234.097058,222.217168 C234.097058,218.175392 232.121269,214.709536 228.175702,212.259183 C226.189231,211.099073 222.254519,209.369382 214.522615,206.777734 C195.973058,200.43062 189.609,193.646221 189.609,180.386799 C189.609,164.636126 203.275981,152.807038 221.191404,152.807038 Z M446.886269,154.485036 L468.460788,154.485036 L495.464615,219.130417 L522.815885,154.485036 L544.22701,154.485036 L500.482644,253.198414 L489.855019,253.198414 L446.886269,154.485036 Z M64.8212135,154.632923 L93.811974,154.632923 C125.842394,154.632923 148.170827,174.418596 148.170827,202.822609 C148.170827,216.985567 141.340038,230.679389 129.788913,239.766893 C120.068962,247.437722 108.994192,250.877669 93.6598558,250.877669 L64.8212135,250.877669 L64.8212135,154.632923 Z M157.25849,154.632923 L177.009462,154.632923 L177.009462,250.877669 L157.25849,250.877669 L157.25849,154.632923 Z M553.156923,154.632923 L609.168423,154.632923 L609.168423,170.940741 L572.892875,170.940741 L572.892875,192.303392 L607.831279,192.303392 L607.831279,208.603619 L572.892875,208.603619 L572.892875,234.583122 L609.168423,234.583122 L609.168423,250.877669 L553.156923,250.877669 L553.156923,154.632923 Z M622.250596,154.632923 L651.534327,154.632923 C674.313452,154.632923 687.366663,165.030007 687.366663,183.048838 C687.366663,197.784414 679.179923,207.454847 664.302885,210.332805 L696.176385,250.877669 L671.888144,250.877669 L644.551904,212.213673 L641.977163,212.213673 L641.977163,250.877669 L622.250596,250.877669 L622.250596,154.632923 Z M641.977163,169.791736 L641.977163,198.939525 L647.748269,198.939525 C660.360308,198.939525 667.044769,193.734406 667.044769,184.05942 C667.044769,174.693052 660.359106,169.791736 648.060019,169.791736 L641.977163,169.791736 Z M84.5571663,170.940741 L84.5571663,234.583122 L89.8568962,234.583122 C102.619538,234.583122 110.679663,232.259105 116.885144,226.934514 C123.71575,221.152572 127.824519,211.920423 127.824519,202.684197 C127.824519,193.462833 123.71575,184.505917 116.885144,178.723975 C110.361615,173.113074 102.619538,170.940741 89.8568962,170.940741 L84.5571663,170.940741 Z" id="Shape" fill="#FFFFFF">

      </path>
                  <path d="M399.164288,151.559424 C428.914452,151.559424 453.031096,173.727429 453.031096,201.112187 L453.031096,201.143399 C453.031096,228.528147 428.914452,250.727374 399.164288,250.727374 C369.414125,250.727374 345.297481,228.528147 345.297481,201.143399 L345.297481,201.112187 C345.297481,173.727429 369.414125,151.559424 399.164288,151.559424 Z M749.982612,271.093939 C724.934651,288.327133 537.408564,411.490963 212.719237,470.985071 L697.105507,470.985071 C726.303228,470.985071 749.982612,447.830504 749.982612,419.274807 L749.982612,271.093939 Z" id="Shape" fill="#F47216">

      </path>
              </g>
          </g>
      </svg>
  )
};



const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  
  // Data from previous screens
  const [formData, setFormData] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [initialedSections, setInitialedSections] = useState(null);
  
  // Payment form state
  const [paymentFormData, setPaymentFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    billingZipCode: ''
  });
  
  // Converge payment state
  const [convergeInfo, setConvergeInfo] = useState(null);
  const [isLoadingConverge, setIsLoadingConverge] = useState(false);
  
  // Other state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showProcessorDemo, setShowProcessorDemo] = useState(false);
  const [paymentResponse, setPaymentResponse] = useState(null);
  const [processorName, setProcessorName] = useState('');
  const [processorInfo, setProcessorInfo] = useState(null);
  const [errors, setErrors] = useState({});
  
  // Get enrollment data and fetch payment processor info
  useEffect(() => {
    if (location.state) {
      const { formData, signatureData, initialedSections } = location.state;
      
      if (formData) {
        setFormData(formData);
        
        // Pre-fill the name on card if available
        if (formData.firstName && formData.lastName) {
          setPaymentFormData(prev => ({
            ...prev,
            nameOnCard: `${formData.firstName} ${formData.lastName}`
          }));
          
          // Pre-fill billing zip code if available
          if (formData.zipCode) {
            setPaymentFormData(prev => ({
              ...prev,
              billingZipCode: formData.zipCode
            }));
          }
        }
        
        // Fetch the credit card processor for the club
        const fetchProcessor = async () => {
          try {
            const clubId = formData.club || selectedClub?.id || "001";
            console.log('Fetching CC processor for club:', clubId);
            
            // Set a default processor in case API calls fail
            setProcessorName('CONVERGE'); // Default processor
            
            // First, get the processor name
            const result = await api.getCCProcessorName(clubId);
            console.log('CC processor API result:', result);
            
            if (result && result.success && result.processorName) {
              // Trim any whitespace from the processor name
              const processorToUse = result.processorName.trim();
              console.log('Cleaned processor name:', processorToUse);
              
              // Update state with the cleaned processor name
              setProcessorName(processorToUse);
              
              // Then fetch the appropriate processor info
              if (processorToUse === 'FLUIDPAY') {
                try {
                  console.log('Fetching FluidPay info for club:', clubId);
                  const fluidPayResult = await api.getFluidPayInfo(clubId);
                  console.log('FluidPay API result:', fluidPayResult);
                  
                  if (fluidPayResult && fluidPayResult.success && fluidPayResult.fluidPayInfo) {
                    console.log('Setting FluidPay processor info:', fluidPayResult.fluidPayInfo);
                    setProcessorInfo(fluidPayResult.fluidPayInfo);
                  } else {
                    // Set fallback info for FluidPay
                    setProcessorInfo({
                      merchant_id: 'Demo FluidPay Merchant',
                      fluidpay_base_url: 'https://api.fluidpay.com',
                      fluidpay_api_key: 'pub_31FUYRENhNiAvspejegbLoPD2he'
                    });
                  }
                } catch (error) {
                  console.error('Error fetching FluidPay info:', error);
                  setProcessorInfo({
                    merchant_id: 'Demo FluidPay Merchant (Fallback)',
                    fluidpay_base_url: 'https://api.fluidpay.com',
                    fluidpay_api_key: 'pub_31FUYRENhNiAvspejegbLoPD2he'
                  });
                }
              } else {
                // Use CONVERGE as default if not FluidPay
                try {
                  console.log('Fetching Converge info for club:', clubId);
                  const convergeResult = await api.getConvergeInfo(clubId);
                  console.log('Converge API result:', convergeResult);
                  
                  if (convergeResult && convergeResult.success && convergeResult.convergeInfo) {
                    console.log('Setting Converge processor info:', convergeResult.convergeInfo);
                    setConvergeInfo(convergeResult.convergeInfo);
                    setProcessorInfo(convergeResult.convergeInfo);
                  } else {
                    // Set fallback info for Converge
                    const fallbackInfo = {
                      merchant_id: 'Demo Converge Merchant',
                      converge_user_id: 'webuser',
                      converge_url_process: 'https://api.demo.convergepay.com/VirtualMerchantDemo'
                    };
                    setConvergeInfo(fallbackInfo);
                    setProcessorInfo(fallbackInfo);
                  }
                } catch (error) {
                  console.error('Error fetching Converge info:', error);
                  const fallbackInfo = {
                    merchant_id: 'Demo Converge Merchant (Fallback)',
                    converge_user_id: 'webuser',
                    converge_url_process: 'https://api.demo.convergepay.com/VirtualMerchantDemo'
                  };
                  setConvergeInfo(fallbackInfo);
                  setProcessorInfo(fallbackInfo);
                }
              }
            } else {
              // No processor name from API, use default
              console.log('No processor name returned, using default CONVERGE');
              
              try {
                const convergeResult = await api.getConvergeInfo(clubId);
                if (convergeResult && convergeResult.success && convergeResult.convergeInfo) {
                  setConvergeInfo(convergeResult.convergeInfo);
                  setProcessorInfo(convergeResult.convergeInfo);
                } else {
                  const fallbackInfo = {
                    merchant_id: 'Demo Converge Merchant (Default)',
                    converge_user_id: 'webuser',
                    converge_url_process: 'https://api.demo.convergepay.com/VirtualMerchantDemo'
                  };
                  setConvergeInfo(fallbackInfo);
                  setProcessorInfo(fallbackInfo);
                }
              } catch (error) {
                console.error('Error fetching default Converge info:', error);
                const fallbackInfo = {
                  merchant_id: 'Demo Converge Merchant (Fallback)',
                  converge_user_id: 'webuser',
                  converge_url_process: 'https://api.demo.convergepay.com/VirtualMerchantDemo'
                };
                setConvergeInfo(fallbackInfo);
                setProcessorInfo(fallbackInfo);
              }
            }
          } catch (error) {
            console.error('Error in fetchProcessor:', error);
            // Ensure we at least have a processor name and info
            setProcessorName('CONVERGE');
            const fallbackInfo = {
              merchant_id: 'Demo Converge Merchant (Error Fallback)',
              converge_user_id: 'webuser',
              converge_url_process: 'https://api.demo.convergepay.com/VirtualMerchantDemo'
            };
            setConvergeInfo(fallbackInfo);
            setProcessorInfo(fallbackInfo);
          }
        };
        
        fetchProcessor();
      }
      
      if (signatureData) {
        setSignatureData(signatureData);
      }
      if (initialedSections) {
        setInitialedSections(initialedSections);
      }
    } else {
      // If no data, go back to enrollment form
      navigate('/enrollment');
    }
  }, [location, navigate, selectedClub]);
  
  // Handle payment form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Format card number with spaces
    if (name === 'cardNumber') {
      const formatted = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      setPaymentFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
    } 
    // Format expiry date as MM/YY
    else if (name === 'expiryDate') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 2) {
        setPaymentFormData(prev => ({
          ...prev,
          [name]: cleaned
        }));
      } else {
        const formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
        setPaymentFormData(prev => ({
          ...prev,
          [name]: formatted
        }));
      }
    } 
    // Other fields
    else {
      setPaymentFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear errors when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };


    // Determine card type based on card number
  const getCardType = () => {
    const number = paymentFormData.cardNumber.replace(/\s/g, '');
    
    // Simple card detection
    if (number.startsWith('4')) {
      return 'visa';
    } else if (number.startsWith('5')) {
      return 'mastercard';
    } else if (number.startsWith('3')) {
      return 'amex';
    } else if (number.startsWith('6')) {
      return 'discover';
    }
    return '';
  };


    // Format card number for display with masking except last 4 digits
  const formatCardNumberDisplay = () => {
    const cardNumber = paymentFormData.cardNumber.replace(/\s/g, '');
    
    if (!cardNumber) return '•••• •••• •••• ••••';
    
    // Mask all but the last four digits
    const lastFour = cardNumber.slice(-4);
    const masked = '•••• '.repeat(3) + lastFour;
    
    return masked;
  };
  
  // Get card logo component
  const getCardLogo = () => {
    const type = getCardType();
    if (type === 'visa') return <CardLogos.Visa />;
    if (type === 'mastercard') return <CardLogos.Mastercard />;
    if (type === 'amex') return <CardLogos.Amex />;
    if (type === 'discover') return <CardLogos.Discover />;
    return null;
  };

  
  // Validate payment form
  const validatePaymentForm = () => {
    const newErrors = {};
    
    // Card number validation (simple length check)
    const cardNumberClean = paymentFormData.cardNumber.replace(/\D/g, '');
    if (!cardNumberClean) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cardNumberClean.length < 14 || cardNumberClean.length > 19) {
      newErrors.cardNumber = 'Please enter a valid card number';
    }
    
    // Expiry date validation
    if (!paymentFormData.expiryDate) {
      newErrors.expiryDate = 'Expiration date is required';
    } else {
      const [month, year] = paymentFormData.expiryDate.split('/');
      const currentYear = new Date().getFullYear() % 100; // Get last 2 digits
      const currentMonth = new Date().getMonth() + 1; // 1-12
      
      if (!month || !year || month > 12 || month < 1) {
        newErrors.expiryDate = 'Please enter a valid expiration date';
      } else if ((parseInt(year) < currentYear) || 
                (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        newErrors.expiryDate = 'Your card has expired';
      }
    }
    
    // CVV validation
    if (!paymentFormData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (!/^\d{3,4}$/.test(paymentFormData.cvv)) {
      newErrors.cvv = 'Please enter a valid CVV';
    }
    
    // Name on card validation
    if (!paymentFormData.nameOnCard) {
      newErrors.nameOnCard = 'Name on card is required';
    } else if (paymentFormData.nameOnCard.length < 3) {
      newErrors.nameOnCard = 'Please enter the full name as it appears on the card';
    }
    
    // Billing zip code validation
    if (!paymentFormData.billingZipCode) {
      newErrors.billingZipCode = 'Billing ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(paymentFormData.billingZipCode)) {
      newErrors.billingZipCode = 'Please enter a valid ZIP code';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Calculate prorated amount due now
  const calculateProratedAmount = () => {
    if (!formData) return 0;
    
    // Use the corrected totalCollected value from ContractPage
    const totalCollected = parseFloat(formData.totalCollected || 0);
    
    // If totalCollected is available and correct, use it
    if (totalCollected > 0) {
      return totalCollected;
    }
    
    // Fallback calculation if totalCollected is not available
    const proratedDues = parseFloat(formData.proratedDues || 0);
    const proratedAddOns = parseFloat(formData.proratedAddOns || 0);
    const taxAmount = parseFloat(formData.taxAmount || 0);
    const enrollmentFee = 19.0; // $19 enrollment fee
    
    // Add PT package amount if selected (use the corrected amount from formData)
    const ptPackageAmount = parseFloat(formData.ptPackageAmount || 0);
    
    // Calculate total using the corrected values
    const total = enrollmentFee + proratedDues + proratedAddOns + ptPackageAmount + taxAmount;
    return Math.round(total * 100) / 100;
  };
  
  // Calculate monthly amount going forward
  const calculateMonthlyAmount = () => {
    if (!formData || !formData.membershipDetails) return 0;
    
    return formData.membershipDetails.price || 0;
  };
  
  // Process payment and show demo
  const processPayment = async () => {
    // Reset submission state
    setSubmitError('');
    
    // Validate the payment form
    if (!validatePaymentForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Process the payment using the demo endpoint
      const paymentData = {
        clubId: formData.club || selectedClub?.id || "001",
        cardNumber: paymentFormData.cardNumber.replace(/\s/g, ''),
        expiryDate: paymentFormData.expiryDate,
        cvv: paymentFormData.cvv,
        nameOnCard: paymentFormData.nameOnCard,
        billingZipCode: paymentFormData.billingZipCode,
        amount: calculateProratedAmount().toFixed(2) || "50.00",
        membershipDetails: formData.membershipDetails,
        processorName: processorName
      };
      
      // Show payment processing popup
      setShowProcessorDemo(true);
      
      // Process payment
      const result = await api.processPaymentDemo(paymentData);
      
      if (result.success) {
        setPaymentResponse(result.paymentResponse);
        
        // Delay to allow user to see the result
        setTimeout(() => {
          finishEnrollment(result.paymentResponse);
        }, 3000);
      } else {
        throw new Error(result.message || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setSubmitError(error.message || 'An error occurred while processing your payment. Please try again.');
      setShowProcessorDemo(false);
      setIsSubmitting(false);
    }
  };
  
  // Complete enrollment after payment
  const finishEnrollment = async (paymentResult) => {
    try {
      // Generate contract PDF buffer
      let contractPDFBuffer = null;
      try {
        const signatureDate = new Date().toLocaleDateString();
        const membershipPrice = formData.membershipDetails?.price || formData.monthlyDues;
        
        contractPDFBuffer = await generateContractPDFBuffer(
          formData,
          signatureData,
          signatureDate,
          initialedSections,
          selectedClub,
          membershipPrice
        );
        
        console.log('Contract PDF generated successfully');
        console.log('PDF buffer type:', typeof contractPDFBuffer);
        console.log('PDF buffer length:', contractPDFBuffer?.byteLength || 0);
      } catch (pdfError) {
        console.error('Error generating contract PDF:', pdfError);
        // Continue without PDF if generation fails
      }

      // Convert ArrayBuffer to array for JSON serialization
      let contractPDFArray = null;
      if (contractPDFBuffer) {
        const uint8Array = new Uint8Array(contractPDFBuffer);
        contractPDFArray = Array.from(uint8Array);
        console.log('Converted to array, length:', contractPDFArray.length);
      }

      // Combine all data for submission
      const submissionData = {
        ...formData,
        // Add signature data
        signatureData: signatureData,
        // Add selected club data
        selectedClub: selectedClub,
        // Add contract PDF as array
        contractPDF: contractPDFArray,
        // Add payment data
        paymentInfo: {
          ...paymentFormData,
          // Remove spaces from card number
          cardNumber: paymentFormData.cardNumber.replace(/\s/g, ''),
          // Add payment response
          processorName: processorName,
          transactionId: paymentResult.transaction_id || paymentResult.ssl_txn_id,
          authorizationCode: paymentResult.authorization_code || paymentResult.ssl_approval_code,
          last4: paymentResult.card_info?.last_four || paymentResult.ssl_card_number?.slice(-4)
        }
      };
      
      console.log('Submitting enrollment data:', submissionData);
      
      // Submit the form data to the server
      const response = await api.post('/enrollment', submissionData);
      
      // Navigate to confirmation page
      navigate('/enrollment-confirmation', { 
        state: { 
          enrollmentData: response.data,
          memberName: `${formData.firstName} ${formData.lastName}`,
          successMessage: `Welcome to ${selectedClub?.name || 'the club'}, ${formData.firstName}! Your enrollment has been successfully submitted.`,
          paymentResponse: paymentResult,
          formData: formData,              
          signatureData: signatureData,     
          initialedSections: initialedSections,
          membershipNumber: response.data.custCode,
          transactionId: response.data.transactionId,
          amountBilled: response.data.amountBilled
        } 
      });
    } catch (error) {
      console.error('Enrollment submission error:', error);
      setSubmitError('Payment was processed successfully, but there was an error saving your enrollment. Please contact customer support.');
      setIsSubmitting(false);
    }
  };
  
  // Add state to track payment method selection - auto-select based on club
  const [paymentMethod, setPaymentMethod] = useState('standard');
  
  // Fetch Converge processor information
  const fetchConvergeInfo = async () => {
    if (!formData?.club) return;
    
    setIsLoadingConverge(true);
    try {
      const response = await api.get(`/payment/converge-info?clubId=${formData.club}`);
      setConvergeInfo(response.data);
      console.log('Converge API result:', response.data);
    } catch (error) {
      console.error('Error fetching Converge info:', error);
      setSubmitError('Failed to load payment processor information');
    } finally {
      setIsLoadingConverge(false);
    }
  };

  // State for Converge direct API payment
  const [convergePaymentData, setConvergePaymentData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: ''
  });

  // Clear sensitive data immediately after use
  const clearSensitiveData = () => {
    setConvergePaymentData({
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      cardholderName: ''
    });
  };

    // Process Converge payment - hosted fields approach
  const processConvergePayment = async () => {
    if (!convergeInfo || !formData) {
      setSubmitError('Payment processor information not available');
      return;
    }

    // Validate payment data
    if (!convergePaymentData.cardNumber || !convergePaymentData.expiryMonth || 
        !convergePaymentData.expiryYear || !convergePaymentData.cvv || 
        !convergePaymentData.cardholderName) {
      setSubmitError('Please fill in all payment fields');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Step 1: Tokenize the card data (card data goes directly to Converge)
      const tokenizationData = {
        cardData: {
          cardNumber: convergePaymentData.cardNumber.replace(/\s/g, ''),
          expiryDate: `${convergePaymentData.expiryMonth}${convergePaymentData.expiryYear}`,
          cvv: convergePaymentData.cvv,
          firstName: formData.firstName,
          lastName: formData.lastName
        },
        convergeInfo: {
          ssl_merchant_id: convergeInfo.merchant_id?.trim(),
          ssl_user_id: convergeInfo.converge_user_id?.trim(),
          ssl_pin: convergeInfo.converge_pin?.trim(),
          ssl_url_process: convergeInfo.converge_url_process
        }
      };

      console.log('Tokenizing card data...');

      // Get token from Converge (card data never touches your server)
      const tokenResponse = await fetch('/api/payment/converge-tokenize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenizationData)
      });

      const tokenResult = await tokenResponse.json();

      if (!tokenResult.success) {
        setSubmitError(tokenResult.message || 'Card tokenization failed');
        setIsSubmitting(false);
        return;
      }

      console.log('Card tokenized successfully, processing payment...');

      // Step 2: Process payment using the token (no card data)
      const paymentData = {
        token: tokenResult.token,
        amount: calculateProratedAmount().toFixed(2),
        convergeInfo: {
          ssl_merchant_id: convergeInfo.merchant_id?.trim(),
          ssl_user_id: convergeInfo.converge_user_id?.trim(),
          ssl_pin: convergeInfo.converge_pin?.trim(),
          ssl_url_process: convergeInfo.converge_url_process
        },
        customerData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          address: formData.address || '',
          city: formData.city || '',
          state: formData.state || '',
          zipCode: formData.zipCode || '',
          email: formData.email || '',
          phone: formData.phone || ''
        }
      };

      // Process payment with token (secure - no card data)
      const paymentResponse = await fetch('/api/payment/converge-pay-with-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      const result = await paymentResponse.json();

      if (result.success) {
        // Payment successful
        setShowProcessorDemo(true);
        setPaymentResponse({
          success: true,
          message: 'Payment processed successfully!',
          transaction_id: result.transaction_id,
          authorization_code: result.authorization_code,
          payment_token: result.payment_token
        });

        // Store the payment token for future use
        if (result.payment_token) {
          console.log('Payment token received:', result.payment_token);
          // You can store this token in your database, localStorage, or pass it to your enrollment system
          // Example: localStorage.setItem('payment_token', result.payment_token);
        }

        // Clear sensitive payment data from memory
        clearSensitiveData();

        // Complete enrollment after successful payment
        await finishEnrollment({
          transactionId: result.transaction_id,
          authorizationCode: result.authorization_code,
          paymentToken: result.payment_token
        });
      } else {
        // Payment failed
        setSubmitError(result.message || 'Payment failed. Please try again.');
      }

      setIsSubmitting(false);

    } catch (error) {
      console.error('Converge payment error:', error);
      setSubmitError('Failed to process payment. Please try again.');
      clearSensitiveData(); // Clear data on error too
      setIsSubmitting(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Automatically use the correct payment method based on club
    if (processorName === 'CONVERGE') {
      await processConvergePayment();
      return;
    }
    
    // Otherwise process payment normally (FluidPay or other)
    await processPayment();
  };
  
  // Load Converge info when component mounts and club is available
  useEffect(() => {
    if (formData?.club && processorName === 'CONVERGE') {
      fetchConvergeInfo();
    }
  }, [formData?.club, processorName]);

  // Auto-select payment method based on club location
  useEffect(() => {
    if (selectedClub && processorName) {
      const isNewMexicoClub = selectedClub.state === 'NM';
      const isColoradoClub = selectedClub.state === 'CO';
      
      if (isNewMexicoClub && processorName === 'CONVERGE') {
        setPaymentMethod('converge-lightbox');
      } else if (isColoradoClub && processorName === 'FLUIDPAY') {
        setPaymentMethod('standard'); // FluidPay uses standard form
      } else {
        setPaymentMethod('standard'); // Default fallback
      }
    }
  }, [selectedClub, processorName]);
  
  if (!formData) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <>
      <style>
        {`
                      /* Ultra-specific CSS to override all other styles */
            div.converge-embedded-form form.payment-form {
              gap: 1rem !important;
            }
          
          div.converge-embedded-form form.payment-form div.form-group {
            margin-bottom: 0 !important;
          }
          
                      div.converge-embedded-form form.payment-form div.form-group label {
              margin-bottom: 0.5rem !important;
              font-size: 0.9rem !important;
              font-weight: 600 !important;
              color: #495057 !important;
            }
          
                      div.converge-embedded-form form.payment-form div.form-group input,
            div.converge-embedded-form form.payment-form div.form-group select {
              height: 2.5rem !important;
              padding: 0.75rem !important;
              margin-bottom: 0 !important;
              border: 1px solid #ced4da !important;
              border-radius: 4px !important;
              font-size: 1rem !important;
            }
          
                      div.converge-embedded-form form.payment-form div.form-row {
              gap: 0.75rem !important;
              margin-bottom: 0 !important;
              display: flex !important;
            }
          
          div.converge-embedded-form form.payment-form div.form-row div.form-group {
            margin-bottom: 0 !important;
          }
        `}
      </style>
      <div className="payment-container">
        <h1>Complete Your Membership</h1>
      
      <div className="payment-layout">
        <div className="payment-summary">
          <h2>Payment Summary</h2>
          
          {processorName && (
            <div className="processor-info">
              <h3>Payment Processor Information</h3>
              <div className="processor-details">
                <p className="processor-name">
                  <span className="detail-label">Processor:</span> 
                  <span className="detail-value">{processorName === 'FLUIDPAY' ? 'FluidPay' : 'Converge (Elavon)'}</span>
                </p>
                
                {processorInfo && (
                  <div className="processor-config">
                    {processorName === 'FLUIDPAY' ? (
                      <>
                        <p className="detail-item">
                          <span className="detail-label">Merchant ID:</span>
                          <span className="detail-value">{processorInfo.merchant_id}</span>
                        </p>
                        <p className="detail-item">
                          <span className="detail-label">Base URL:</span>
                          <span className="detail-value">{processorInfo.fluidpay_base_url ? '✓ Configured' : '⚠️ Missing'}</span>
                        </p>
                        <p className="detail-item">
                          <span className="detail-label">API Key:</span>
                          <span className="detail-value">{processorInfo.fluidpay_api_key ? '✓ Configured' : '⚠️ Missing'}</span>
                        </p>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                )}
                
                {!processorInfo && (
                  <p className="processor-warning">⚠️ Processor configuration not found for this club.</p>
                )}
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

             {/* Credit Card Logos */}
          <div className="credit-card-logos" style={{ marginBottom: "0.25rem", padding: "0.25rem" }}>
            <div className={getCardType() === 'visa' ? 'active' : ''}>
              <CardLogos.Visa />
            </div>
            <div className={getCardType() === 'mastercard' ? 'active' : ''}>
              <CardLogos.Mastercard />
            </div>
            <div className={getCardType() === 'amex' ? 'active' : ''}>
              <CardLogos.Amex />
            </div>
            <div className={getCardType() === 'discover' ? 'active' : ''}>
              <CardLogos.Discover />
            </div>
          </div>
          
          {/* Payment Method Information */}
          <div className="payment-method-info">
            <h3>Payment Method</h3>
            <div className="payment-method-display">
              {processorName === 'CONVERGE' ? (
                <div className="payment-method-converge">
                  <span className="payment-method-title">Converge Secure Payment</span>
                  <span className="payment-method-description">Your payment will be processed securely through Converge's payment system</span>
                </div>
              ) : (
                <div className="payment-method-standard">
                  <span className="payment-method-title">Direct Payment Form</span>
                  <span className="payment-method-description">Enter your card details directly on this page</span>
                </div>
              )}
            </div>
          </div>

          {processorName === 'CONVERGE' ? (
            // Show embedded Converge payment form directly
            <div className="converge-embedded-form">
              <div className="form-header">
                <h4>Complete Your Payment</h4>
                <p>Please enter your payment information below. Your card data is securely tokenized and never stored on our servers.</p>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); processConvergePayment(); }} className="payment-form">
                <div className="form-group">
                  <label htmlFor="cardholderName">Cardholder Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="cardholderName"
                    value={convergePaymentData.cardholderName}
                    onChange={(e) => setConvergePaymentData(prev => ({ ...prev, cardholderName: e.target.value }))}
                    placeholder="Name on card"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="cardNumber">Card Number <span className="required">*</span></label>
                  <div className="input-icon-container">
                    <input
                      type="text"
                      id="cardNumber"
                      value={convergePaymentData.cardNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                        setConvergePaymentData(prev => ({ ...prev, cardNumber: value }));
                      }}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                      required
                    />
                    <div className="card-type-icon">
                      {/* Card type icons will be shown here */}
                    </div>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expiryMonth">Expiry Month <span className="required">*</span></label>
                    <select
                      id="expiryMonth"
                      value={convergePaymentData.expiryMonth}
                      onChange={(e) => setConvergePaymentData(prev => ({ ...prev, expiryMonth: e.target.value }))}
                      required
                    >
                      <option value="">Month</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month.toString().padStart(2, '0')}>
                          {month.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="expiryYear">Expiry Year <span className="required">*</span></label>
                    <select
                      id="expiryYear"
                      value={convergePaymentData.expiryYear}
                      onChange={(e) => setConvergePaymentData(prev => ({ ...prev, expiryYear: e.target.value }))}
                      required
                    >
                      <option value="">Year</option>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                        <option key={year} value={year.toString().slice(-2)}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="cvv">CVV <span className="required">*</span></label>
                    <input
                      type="text"
                      id="cvv"
                      value={convergePaymentData.cvv}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setConvergePaymentData(prev => ({ ...prev, cvv: value }));
                      }}
                      placeholder="123"
                      maxLength="4"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="secondary-button"
                    onClick={() => navigate(-1)}
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="primary-button"
                    disabled={isSubmitting || isLoadingConverge || !convergeInfo}
                  >
                    {isSubmitting ? 'Processing Payment...' : `Pay $${calculateProratedAmount().toFixed(2)}`}
                  </button>
                </div>
                
                <div className="security-notice">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  Your payment information is secure and encrypted
                </div>
              </form>
            </div>
          ) : (
            <form className="payment-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="cardNumber">
                Card Number <span className="required">*</span>
              </label>
              <input
                type="text"
                id="cardNumber"
                name="cardNumber"
                value={paymentFormData.cardNumber}
                onChange={handleInputChange}
                placeholder="**** **** **** ****"
                maxLength="19"
              />
              {errors.cardNumber && (
                <div className="error-message">{errors.cardNumber}</div>
              )}
            </div>
            
           <div style={{ display: "flex", gap: "5px", margin: 0 }}>
              <div className="form-group" style={{ flex: 0.8, margin: 0 }}>
                <label htmlFor="expiryDate" style={{ fontSize: "0.8rem", marginBottom: "0.1rem" }}>
                  Expiration Date <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="expiryDate"
                  name="expiryDate"
                  value={paymentFormData.expiryDate}
                  onChange={handleInputChange}
                  placeholder="MM/YY"
                  maxLength="5"
                  style={{ padding: "0.25rem 0.5rem", height: "28px" }}
                />
                {errors.expiryDate && (
                  <div className="error-message" style={{ fontSize: "0.7rem", marginTop: "0.1rem" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {errors.expiryDate}
                  </div>
                )}
              </div>
              
              <div className="form-group" style={{ flex: 0.5, margin: 0 }}>
                <label htmlFor="cvv" style={{ fontSize: "0.8rem", marginBottom: "0.1rem" }}>
                  CVV <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="cvv"
                  name="cvv"
                  value={paymentFormData.cvv}
                  onChange={handleInputChange}
                  placeholder="***"
                  maxLength="4"
                  style={{ padding: "0.25rem 0.5rem", height: "28px" }}
                />
                {errors.cvv && (
                  <div className="error-message" style={{ fontSize: "0.7rem", marginTop: "0.1rem" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {errors.cvv}
                  </div>
                )}
              </div>
              
              <div className="form-group" style={{ flex: 0.7, margin: 0 }}>
                <label htmlFor="billingZipCode" style={{ fontSize: "0.8rem", marginBottom: "0.1rem" }}>
                  ZIP <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="billingZipCode"
                  name="billingZipCode"
                  value={paymentFormData.billingZipCode}
                  onChange={handleInputChange}
                  placeholder="ZIP"
                  maxLength="5"
                  style={{ padding: "0.25rem 0.5rem", height: "28px" }}
                />
                {errors.billingZipCode && (
                  <div className="error-message" style={{ fontSize: "0.7rem", marginTop: "0.1rem" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {errors.billingZipCode}
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="nameOnCard">
                Name on Card <span className="required">*</span>
              </label>
              <input
                type="text"
                id="nameOnCard"
                name="nameOnCard"
                value={paymentFormData.nameOnCard}
                onChange={handleInputChange}
                placeholder="Enter name as it appears on card"
              />
              {errors.nameOnCard && (
                <div className="error-message">{errors.nameOnCard}</div>
              )}
            </div>
            
            
            <div className="form-actions">
              <button 
                type="button" 
                className="secondary-button"
                onClick={() => navigate(-1)}
              >
                Back
              </button>
              <button 
                type="submit" 
                className="primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : processorName === 'CONVERGE' ? "Open Secure Payment Form" : "Submit Enrollment"}
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
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default PaymentPage;
