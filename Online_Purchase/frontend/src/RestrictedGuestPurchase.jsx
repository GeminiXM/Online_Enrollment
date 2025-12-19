import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import "./styles.css";

const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
};

const CLUB_ID_TO_NAME = {
  "201": "Highpoint Sports & Wellness",
  "202": "Midtown Sports & Wellness",
  "203": "Downtown Sports & Wellness",
  "204": "Del Norte Sports & Wellness",
  "205": "Riverpoint Sports & Wellness",
  "252": "Colorado Athletic Club - DTC",
  "254": "Colorado Athletic Club - Tabor Center",
  "257": "Colorado Athletic Club - Flatirons",
  "292": "Colorado Athletic Club - Monaco",
};

const REGION_CLUBS = [
  {
    id: "CO",
    label: "Colorado",
    clubs: ["252", "254", "257", "292"],
  },
  {
    id: "NM",
    label: "New Mexico",
    clubs: ["201", "202", "203", "204", "205"],
  },
];

export default function RestrictedGuestPurchase() {
  const [region, setRegion] = useState("");
  const [clubId, setClubId] = useState("");
  const [ptPackage, setPtPackage] = useState(null);
  const [specials, setSpecials] = useState([]);
  const [specialsMessage, setSpecialsMessage] = useState("");
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Guest form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [goals, setGoals] = useState("");
  const [preferredTrainer, setPreferredTrainer] = useState("");

  const friendlyPaymentErrorMessage =
    "We ran into an issue completing your purchase. A team member will review this and contact you shortly, or you can reach out to your club to confirm.";

  // Payment (FluidPay / Converge) – reuse shapes from App.jsx
  const isColorado = useMemo(() => region === "CO", [region]);
  const isNewMexico = useMemo(() => region === "NM", [region]);
  const [fluidPayInfo, setFluidPayInfo] = useState(null);
  const [fluidPayReady, setFluidPayReady] = useState(false);
  const fluidPayTokenizerRef = useRef(null);
  const [tokenizerMountKey, setTokenizerMountKey] = useState(0);
  const [convergeReady, setConvergeReady] = useState(false);

  const clubDisplayName = useMemo(() => {
    if (!clubId) return "";
    return CLUB_ID_TO_NAME[String(clubId)] || `Club ${clubId}`;
  }, [clubId]);

  const getGuestSnapshot = useCallback(() => {
    const readInput = (id, fallback) => {
      try {
        const el = document.getElementById(id);
        if (el && typeof el.value === "string") {
          return el.value;
        }
      } catch {
        // ignore DOM read issues and fall back to state
      }
      return fallback;
    };
    return {
      firstName: readInput("sg-first-name", firstName),
      lastName: readInput("sg-last-name", lastName),
      middleInitial: readInput("sg-middle-initial", middleInitial),
      dateOfBirth: readInput("sg-dob", dateOfBirth),
      gender: readInput("sg-gender", gender),
      address1: readInput("sg-address1", address1),
      address2: readInput("sg-address2", address2),
      city: readInput("sg-city", city),
      state: readInput("sg-state", state),
      zipCode: readInput("sg-zip", zipCode),
      mobilePhone: readInput("sg-phone", phone),
      homePhone: "",
      workPhone: "",
      email: readInput("sg-email", email),
      goals: readInput("sg-goals", goals),
      preferredTrainer: readInput("sg-preferred-trainer", preferredTrainer),
    };
  }, [
    firstName,
    lastName,
    middleInitial,
    dateOfBirth,
    gender,
    address1,
    address2,
    city,
    state,
    zipCode,
    phone,
    email,
    goals,
    preferredTrainer,
  ]);

  const canSubmitGuest =
    region &&
    clubId &&
    firstName.trim() &&
    lastName.trim() &&
    phone.trim() &&
    email.trim() &&
    state.trim();

  // Load PT package + specials when club changes
  useEffect(() => {
    if (!clubId) {
      setPtPackage(null);
      setSpecials([]);
      setSpecialsMessage("");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingPackage(true);
        setError("");
        setSuccess("");
        setPaymentError("");

        const { ok, data } = await fetchJson(
          `/api/online-buy/pt-package?clubId=${clubId}`
        );
        if (!ok || !data?.success) {
          throw new Error(
            data?.message || "Failed to load online special package"
          );
        }
        if (cancelled) return;
        setPtPackage(data.ptPackage);

        const { ok: okS, data: dataS } = await fetchJson(
          `/api/online-buy/specials?clubId=${clubId}`
        );
        if (!okS || !dataS?.success) {
          setSpecials([]);
          setSpecialsMessage((dataS?.message || "").toString());
        } else {
          setSpecials(Array.isArray(dataS.specials) ? dataS.specials : []);
          setSpecialsMessage((dataS.message || "").toString());
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingPackage(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clubId]);

  // FluidPay config for CO
  useEffect(() => {
    if (!isColorado || !clubId) {
      return;
    }

    let cancelled = false;
    (async () => {
      const { ok, data } = await fetchJson(
        `/api/online-buy/fluidpay-info?clubId=${clubId}`
      );
      if (cancelled) return;
      if (ok && data?.success && data.fluidPayInfo) {
        setFluidPayInfo(data.fluidPayInfo);
      } else if (ok === false) {
        const msg = data?.message || "Unable to load FluidPay configuration.";
        setPaymentError(msg);
      }
    })();

    return () => {
      cancelled = true;
      setFluidPayInfo(null);
      setFluidPayReady(false);
      fluidPayTokenizerRef.current = null;
    };
  }, [clubId, isColorado]);

  // Initialize FluidPay tokenizer
  useEffect(() => {
    if (!isColorado || !fluidPayInfo?.publicKey || !ptPackage) {
      return;
    }

    const initTokenizer = () => {
      if (!window.Tokenizer) return;
      try {
        if (fluidPayTokenizerRef.current?.destroy) {
          fluidPayTokenizerRef.current.destroy();
        }
      } catch (_) {}

      try {
        setTokenizerMountKey((k) => k + 1);
        const createTokenizer = () => {
          try {
            const el = document.querySelector("#restricted-fluidpay-tokenizer");
            if (el) el.innerHTML = "";
          } catch (_) {}
          const tokenizer = new window.Tokenizer({
            apikey: fluidPayInfo.publicKey,
            container: "#restricted-fluidpay-tokenizer",
            settings: {
              payment: { types: ["card"] },
              user: { showInline: true, showName: true, prefill: true },
              billing: { show: true, prefill: true },
            },
            submission: (resp) => {
              if (resp.status === "success" && resp.token) {
                handleFluidPayToken(resp.token);
              } else if (resp.status === "error") {
                const msg = resp.msg || "Payment form error.";
                setPaymentError(msg);
                setPaymentSubmitting(false);
              } else if (resp.status === "validation") {
                const msg = "Please check your payment information and try again.";
                setPaymentError(msg);
                setPaymentSubmitting(false);
              }
            },
          });
          fluidPayTokenizerRef.current = tokenizer;
          setFluidPayReady(true);
        };

        requestAnimationFrame(() => {
          requestAnimationFrame(createTokenizer);
        });
      } catch (err) {
        const msg =
          "Unable to initialize FluidPay form. Please refresh and try again.";
        setPaymentError(msg);
        setFluidPayReady(false);
        fluidPayTokenizerRef.current = null;
        setPaymentSubmitting(false);
      }
    };

    let scriptElement = null;
    if (!window.Tokenizer) {
      scriptElement = document.createElement("script");
      scriptElement.id = "restricted-fluidpay-tokenizer-script";
      scriptElement.src = "https://app.fluidpay.com/tokenizer/tokenizer.js";
      scriptElement.async = true;
      scriptElement.onload = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(initTokenizer);
        });
      };
      scriptElement.onerror = () => {
        const msg =
          "Unable to load FluidPay payment form. Please refresh and try again.";
        setPaymentError(msg);
      };
      document.body.appendChild(scriptElement);
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(initTokenizer);
      });
    }

    return () => {
      if (scriptElement && scriptElement.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
      }
      if (fluidPayTokenizerRef.current?.destroy) {
        try {
          fluidPayTokenizerRef.current.destroy();
        } catch (_) {}
      }
      fluidPayTokenizerRef.current = null;
      setFluidPayReady(false);
    };
  }, [isColorado, fluidPayInfo, ptPackage]);

  // Converge HPP script for NM
  useEffect(() => {
    if (!isNewMexico) {
      setConvergeReady(false);
      return;
    }

    let scriptRef = document.getElementById("restricted-converge-pay-script");
    if (!scriptRef) {
      scriptRef = document.createElement("script");
      scriptRef.id = "restricted-converge-pay-script";
      scriptRef.src =
        "https://api.convergepay.com/hosted-payments/PayWithConverge.js";
      scriptRef.async = true;
      scriptRef.onload = () => setConvergeReady(true);
      scriptRef.onerror = () => {
        const msg =
          "Unable to load Converge payment window. Please refresh and try again.";
        setPaymentError(msg);
      };
      document.body.appendChild(scriptRef);
    } else {
      setConvergeReady(true);
    }

    return () => {
      setConvergeReady(false);
    };
  }, [isNewMexico]);

  // Listen for Converge HPP response
  const handleConvergeSuccess = useCallback(
    async (response) => {
      if (!clubId || !ptPackage) {
        setPaymentError("Club or package details missing. Please try again.");
        setPaymentSubmitting(false);
        return;
      }
      try {
        const rawBrand = (
          response?.ssl_card_short_description ||
          response?.aal_card_short_description ||
          response?.ssl_card_type ||
          response?.card_type ||
          ""
        )
          .toString()
          .trim();
        const last4FromCardNum =
          (/\d{4}$/.exec(
            (response?.ssl_card_number || "").toString()
          ) || [null])[0];
        const last4FromMasked =
          (/\d{4}$/.exec(
            (response?.ssl_card_number_masked || "").toString()
          ) || [null])[0];
        const last4 = (
          response?.ssl_last4 ||
          response?.ssl_last_four_digits ||
          ""
        )
          .toString()
          .trim() || last4FromCardNum || last4FromMasked || "";
        const masked = last4
          ? `************${last4}`
          : (response?.ssl_card_number_masked || "").toString().trim();
        const rawExp = (response?.ssl_exp_date || "").toString().trim();
        let expDateMMYY = "";
        if (/^\d{4}$/.test(rawExp)) {
          expDateMMYY = `${rawExp.slice(0, 2)}/${rawExp.slice(2)}`;
        } else if (/^\d{2}\/\d{2}$/.test(rawExp)) {
          expDateMMYY = rawExp;
        }

        const transactionId =
          response?.ssl_txn_id ||
          response?.ssl_transaction_id ||
          response?.transaction_id ||
          "";

        const payload = {
          clubId,
          guest: getGuestSnapshot(),
          ptPackage: {
            description: ptPackage.description,
            price: ptPackage.price,
            invtr_upccode: ptPackage.invtr_upccode,
          },
          contact: {
            name: `${firstName} ${lastName}`.trim(),
            phone,
            email,
            goals,
            preferredTrainer,
          },
          payment: {
            processor: "CONVERGE_HPP",
            alreadyProcessed: true,
            transactionId,
            approvalCode: response?.ssl_approval_code || "",
            message: response?.ssl_result_message || "",
            cardBrand: rawBrand,
            cardMasked: masked,
            expDateMMYY,
          },
        };

        const { ok, data } = await fetchJson(
          "/api/online-buy/restricted-guest/purchase",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!ok || !data?.success) {
          throw new Error(data?.message || "Restricted guest purchase failed");
        }

        setSuccess(
          `Payment successful via ${data.processor}. Transaction #${data.transactionId}`
        );
        setReceipt({
          membershipNumber: data.membershipNumber,
          description: ptPackage.description,
          price: Number(ptPackage.price || 0),
          last4: data.last4 || last4 || "",
          dbTransactionId: data.dbTransactionId || "",
          date: new Date().toISOString(),
        });
        setReceiptOpen(true);
        setPaymentError("");
      } catch (err) {
        console.error("Restricted guest Converge payment error", err);
        setPaymentError(friendlyPaymentErrorMessage);
      } finally {
        setPaymentSubmitting(false);
      }
    },
    [
      clubId,
      ptPackage,
      firstName,
      lastName,
      middleInitial,
      dateOfBirth,
      gender,
      address1,
      address2,
      city,
      state,
      zipCode,
      phone,
      email,
    ]
  );

  useEffect(() => {
    if (!isNewMexico) return;

    const handler = (event) => {
      if (!event.origin || !event.origin.includes("convergepay.com")) return;
      const data = event.data;
      if (!data || data.converge !== true) return;

      if (data.cancelled) {
        const msg = "Payment cancelled.";
        setPaymentError(msg);
        setPaymentSubmitting(false);
        return;
      }

      if (data.errored) {
        const msg = data.error || "Payment error.";
        setPaymentError(msg);
        setPaymentSubmitting(false);
        return;
      }

      const response = data.response?.data || data.response;
      if (!response) return;

      const approved =
        response.ssl_result === "0" ||
        (response.ssl_result_message &&
          response.ssl_result_message.toLowerCase().includes("approved")) ||
        !!response.ssl_approval_code;

      if (approved) {
        handleConvergeSuccess(response);
      } else {
        const msg = response.ssl_result_message || "Payment declined.";
        setPaymentError(msg);
        setPaymentSubmitting(false);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isNewMexico, handleConvergeSuccess]);

  const handleFluidPayToken = useCallback(
    async (token) => {
      if (!clubId || !ptPackage) {
        setPaymentError("Club or package details missing. Please try again.");
        setPaymentSubmitting(false);
        return;
      }
      try {
        const payload = {
          clubId,
          guest: getGuestSnapshot(),
          ptPackage: {
            description: ptPackage.description,
            price: ptPackage.price,
            invtr_upccode: ptPackage.invtr_upccode,
          },
          contact: {
            name: `${firstName} ${lastName}`.trim(),
            phone,
            email,
            goals,
            preferredTrainer,
          },
          payment: {
            processor: "FLUIDPAY",
            token,
          },
        };

        const { ok, data } = await fetchJson(
          "/api/online-buy/restricted-guest/purchase",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!ok || !data?.success) {
          throw new Error(data?.message || "Restricted guest purchase failed");
        }

        setSuccess(
          `Payment successful via ${data.processor}. Transaction #${data.transactionId}`
        );
        setReceipt({
          membershipNumber: data.membershipNumber,
          description: ptPackage.description,
          price: Number(ptPackage.price || 0),
          last4: data.last4 || "",
          dbTransactionId: data.dbTransactionId || "",
          date: new Date().toISOString(),
        });
        setReceiptOpen(true);
        setPaymentError("");
      } catch (err) {
        console.error("Restricted guest FluidPay payment error", err);
        setPaymentError(friendlyPaymentErrorMessage);
      } finally {
        setPaymentSubmitting(false);
      }
    },
    [
      clubId,
      ptPackage,
      firstName,
      lastName,
      middleInitial,
      dateOfBirth,
      gender,
      address1,
      address2,
      city,
      state,
      zipCode,
      phone,
      email,
    ]
  );

  const handlePayNow = async () => {
    if (!ptPackage || !clubId || !canSubmitGuest) {
      const missing = [];
      if (!firstName.trim()) missing.push("First Name");
      if (!lastName.trim()) missing.push("Last Name");
      if (!phone.trim()) missing.push("Phone");
      if (!email.trim()) missing.push("Email");
      if (!state.trim()) missing.push("State");

      if (!ptPackage || !clubId) {
        missing.push("Club / Package");
      }

      setError(
        missing.length
          ? `Please complete the required fields: ${missing.join(", ")}.`
          : "Please complete all required member information and select a club/package."
      );
      return;
    }
    setError("");
    setPaymentError("");
    setSuccess("");

    if (isColorado) {
      if (!fluidPayTokenizerRef.current) {
        const msg =
          "Secure payment form is still loading. Please wait a moment and try again.";
        setPaymentError(msg);
        return;
      }
      setPaymentSubmitting(true);
      try {
        fluidPayTokenizerRef.current.submit();
      } catch (err) {
        setPaymentSubmitting(false);
        const msg =
          "Unable to launch FluidPay form. Please refresh and try again.";
        setPaymentError(msg);
      }
      return;
    }

    if (isNewMexico) {
      if (!window.PayWithConverge) {
        const msg = "Converge payment window is still loading. Please wait.";
        setPaymentError(msg);
        return;
      }
      setPaymentSubmitting(true);
      try {
        const body = {
          amount: Number(ptPackage.price || 0).toFixed(2),
          orderId: `PT-RG-${Date.now()}`,
          clubId,
          customerId: undefined,
          memberData: {
            firstName,
            lastName,
            email,
            phone: phone,
            address: address1,
            city,
            state,
            zipCode,
          },
        };
        const { ok, data } = await fetchJson(
          "/api/online-buy/converge-hpp/session-token",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!ok || !data?.ssl_txn_auth_token) {
          const msg =
            data?.message || "Failed to start Converge payment session";
          throw new Error(msg);
        }
        window.PayWithConverge.open({
          ssl_txn_auth_token: data.ssl_txn_auth_token,
        });
      } catch (err) {
        setPaymentError(err.message);
        setPaymentSubmitting(false);
      }
      return;
    }

    const msg = "Unsupported club configuration for payment processing.";
    setPaymentError(msg);
  };

  return (
    <div
      className="op-container restricted-guest-form"
      style={{ marginTop: 32, marginBottom: 32 }}
    >
      <header className="op-header">
        <h1 className="op-title">Special Guest Purchase</h1>
        <p className="op-subtitle">
          Create a Special Guest membership and purchase the current online special.
        </p>
      </header>

      <div className="card">
        <div className="section-title">Club Selection</div>
        <div className="form-row">
          <select
            className="input"
            style={{ flex: "0 0 220px", minWidth: 160 }}
            value={region}
            onChange={(e) => {
              const val = e.target.value;
              setRegion(val);
              setClubId("");
              setPtPackage(null);
              setSpecials([]);
              setSpecialsMessage("");
            }}
          >
            <option value="">Select Region</option>
            {REGION_CLUBS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            className="input"
            style={{ flex: "1 1 auto", minWidth: 220 }}
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            disabled={!region}
          >
            <option value="">Select Club</option>
            {REGION_CLUBS.filter((r) => r.id === region).map((r) =>
              r.clubs.map((id) => (
                <option key={id} value={id}>
                  {CLUB_ID_TO_NAME[id] || `Club ${id}`}
                </option>
              ))
            )}
          </select>
        </div>
        {clubDisplayName && (
          <div className="kv" style={{ marginTop: 8 }}>
            <div className="kv__row">
              <div className="kv__key">Home Club</div>
              <div className="kv__value">{clubDisplayName}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title">Member Information</div>
        <div className="kv">
          {/* Row 1: First, Middle Initial, Last (First/Last required) */}
          <div className="kv__row">
            <div className="kv__key" style={{ flex: "0 0 120px" }}>
              Name
            </div>
            <div
              className="kv__value"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                columnGap: 8,
                minWidth: 0,
              }}
            >
              <input
                id="sg-first-name"
                className="input"
                style={{ minWidth: 0 }}
                placeholder="First Name *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                id="sg-middle-initial"
                className="input"
                style={{
                  minWidth: 0,
                  width: 48,
                  maxWidth: 48,
                  textAlign: "center",
                }}
                maxLength={1}
                placeholder="M"
                value={middleInitial}
                onChange={(e) => setMiddleInitial(e.target.value)}
              />
              <input
                id="sg-last-name"
                className="input"
                style={{ minWidth: 0 }}
                placeholder="Last Name *"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: Required contact info (Phone + Email) */}
          <div className="kv__row">
            <div className="kv__key" style={{ flex: "0 0 120px" }}>
              Contact
            </div>
            <div
              className="kv__value"
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "nowrap",
                  minWidth: 0,
                }}
              >
                <input
                  id="sg-phone"
                  className="input"
                  style={{ flex: "1 1 auto", minWidth: 0 }}
                  placeholder="Phone Number *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <input
                id="sg-email"
                className="input"
                type="email"
                placeholder="Email *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Optional fields explanation */}
          <div className="kv__row">
            <div className="kv__key" style={{ flex: "0 0 120px" }} />
            <div className="kv__value">
              <div className="muted" style={{ fontStyle: "italic" }}>
                The optional fields below help us provide better service.
              </div>
            </div>
          </div>

          {/* Optional Row: DOB + Gender */}
          <div className="kv__row">
            <div className="kv__key" style={{ flex: "0 0 120px" }}>
              Birthday / Gender
            </div>
            <div
              className="kv__value"
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "nowrap",
                minWidth: 0,
              }}
            >
              <input
                id="sg-dob"
                className="input"
                type="date"
                style={{ flex: "0 0 150px" }}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
              <select
                id="sg-gender"
                className="input"
                style={{ flex: "0 0 140px" }}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="N">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Row 3: Address, Address2 (optional) */}
          <div className="kv__row">
            <div className="kv__key" style={{ flex: "0 0 120px" }}>
              Address
            </div>
            <div
              className="kv__value"
              style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
            >
              <input
                id="sg-address1"
                className="input"
                style={{ flex: "1 1 50%" }}
                placeholder="Address"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
              />
              <input
                id="sg-address2"
                className="input"
                style={{ flex: "1 1 40%" }}
                placeholder="Address 2"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: City, State, Zip (optional) */}
          <div className="kv__row">
            <div className="kv__key" style={{ flex: "0 0 120px" }}>
              Location
            </div>
            <div
              className="kv__value"
              style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
            >
              <input
                id="sg-city"
                className="input"
                style={{ flex: "1 1 40%" }}
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <select
                id="sg-state"
                className="input"
                style={{ flex: "0 0 120px" }}
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">State *</option>
                {[
                  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
                  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
                  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
                  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
                  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
                ].map((abbr) => (
                  <option key={abbr} value={abbr}>
                    {abbr}
                  </option>
                ))}
              </select>
              <input
                id="sg-zip"
                className="input"
                style={{ flex: "0 0 120px" }}
                placeholder="ZIP"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>
          </div>
          {/* Row 5: Looking to achieve (optional) */}
          <div className="kv__row">
            <div className="kv__key" style={{ flex: "0 0 120px" }}>
              Looking to achieve
            </div>
            <div className="kv__value">
              <textarea
                id="sg-goals"
                className="input"
                rows={3}
                placeholder="e.g., want to lose weight"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
              />
            </div>
          </div>

          {/* Row 6: Preferred Trainer Name (optional) */}
          <div className="kv__row">
            <div className="kv__key" style={{ flex: "0 0 120px" }}>
              Preferred Trainer Name
            </div>
            <div className="kv__value">
              <input
                id="sg-preferred-trainer"
                className="input"
                placeholder="Preferred Trainer"
                value={preferredTrainer}
                onChange={(e) => setPreferredTrainer(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {ptPackage && (
        <div className="grid">
          <div className="card">
            <div className="section-title">Package</div>
            <div className="kv">
              <div className="kv__row">
                <div className="kv__key">Description</div>
                <div className="kv__value">
                  <span
                    className={
                      !ptPackage?.invtr_upccode ? "specials-empty" : undefined
                    }
                  >
                    {ptPackage.description}
                  </span>
                </div>
              </div>
              <div className="kv__row">
                <div className="kv__key">Price</div>
                <div className="kv__value">
                  {ptPackage.price !== null &&
                  ptPackage.price !== undefined ? (
                    <span className="price">
                      ${Number(ptPackage.price).toFixed(2)}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
              </div>
              <div className="kv__row">
                <div className="kv__key"></div>
                <div className="kv__value">
                  <div className="price-note">
                    (including applicable taxes)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-title">Pay Now</div>

        {isColorado && (
          <div className="stack">
            <div className="tokenizer-shell">
              <div
                id="restricted-fluidpay-tokenizer"
                className="tokenizer-container"
                key={tokenizerMountKey}
              />
              {!fluidPayReady && (
                <div className="tokenizer-loading">
                  <div className="loading-spinner" />
                  <p>Loading secure payment form...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {paymentError && (
          <div className="alert alert--error">{paymentError}</div>
        )}

        <button
          className="btn btn--primary paynow-button"
          onClick={handlePayNow}
          disabled={
            !canSubmitGuest ||
            !ptPackage?.invtr_upccode ||
            paymentSubmitting ||
            (isColorado && (!fluidPayReady || !fluidPayTokenizerRef.current)) ||
            (isNewMexico && !convergeReady) ||
            loadingPackage
          }
        >
          {paymentSubmitting
            ? "Processing..."
            : isNewMexico
            ? "Open Secure Payment"
            : "Pay Now"}
        </button>
        <div className="secure-note">
          Payments are processed securely via hosted payment forms. Your card
          details are tokenized and never stored on our servers.
        </div>
        {success && <div className="alert alert--success">{success}</div>}
        {error && <div className="alert alert--error">{error}</div>}
      </div>

      {receiptOpen && receipt && (
        <div
          className="modal"
          style={{ position: "fixed", inset: 0, zIndex: 10000 }}
        >
          <div
            className="modal__backdrop"
            onClick={() => setReceiptOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(3,18,32,0.55)",
            }}
          />
          <div
            className="modal__content"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(560px, 92vw)",
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 24px 60px rgba(3,18,32,0.35)",
              padding: "18px 18px 16px",
              color: "#0e1b35",
            }}
          >
            <div className="modal__header">
              <h3 className="modal__title">Receipt</h3>
            </div>
            <div className="modal__body">
              <div className="kv" style={{ marginTop: 4 }}>
                <div className="kv__row">
                  <div className="kv__key">Membership #</div>
                  <div className="kv__value">{receipt.membershipNumber}</div>
                </div>
                <div className="kv__row">
                  <div className="kv__key">Package</div>
                  <div className="kv__value">{receipt.description}</div>
                </div>
                <div className="kv__row">
                  <div className="kv__key">Price</div>
                  <div className="kv__value">
                    ${Number(receipt.price || 0).toFixed(2)}
                  </div>
                </div>
                <div className="kv__row">
                  <div className="kv__key">Card</div>
                  <div className="kv__value">
                    {receipt.last4 ? `•••• ${receipt.last4}` : "—"}
                  </div>
                </div>
                <div className="kv__row">
                  <div className="kv__key">Club Transaction #</div>
                  <div className="kv__value">
                    {receipt.dbTransactionId || "—"}
                  </div>
                </div>
                <div className="kv__row">
                  <div className="kv__key">Date</div>
                  <div className="kv__value">
                    {new Date(receipt.date).toLocaleString()}
                  </div>
                </div>
              </div>
              <p className="receipt-note" style={{ marginTop: 12 }}>
                Your Special Guest membership has been created and the above
                item has been added. A Club representative will contact you, or
                you can visit the club to start using this purchase.
              </p>
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className="btn btn--primary"
                  style={{
                    background: "#0082b5",
                    color: "#ffffff",
                    border: "1px solid #006a94",
                  }}
                  onClick={() => setReceiptOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


