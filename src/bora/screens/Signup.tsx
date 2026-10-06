import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "../store";
import { Button, EASE, Icon, Item, Stagger, TopBar } from "../components/ui";
import css from "./Signup.module.css";

type Status = "idle" | "valid" | "error";

function Field({
  id,
  label,
  status = "idle",
  message,
  prefix,
  suffix,
  shake,
  children,
}: {
  id: string;
  label: string;
  status?: Status;
  message?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  shake?: number;
  children: ReactNode;
}) {
  const controls = useAnimationControls();
  useEffect(() => {
    if (shake) controls.start({ x: [0, -8, 7, -5, 3, 0], transition: { duration: 0.42 } });
  }, [shake, controls]);

  return (
    <Item className={css.field}>
      <label htmlFor={id} className={css.label}>
        {label}
      </label>
      <motion.div animate={controls} className={`${css.box} ${status === "error" ? css.error : ""} ${status === "valid" ? css.valid : ""}`}>
        {prefix}
        {children}
        {suffix}
      </motion.div>
      <AnimatePresence initial={false}>
        {message && (
          <motion.span
            key={status}
            className={`${css.message} ${status === "error" ? css.messageError : css.messageValid}`}
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            id={`${id}-msg`}
          >
            {message}
          </motion.span>
        )}
      </AnimatePresence>
    </Item>
  );
}

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export function Signup() {
  const { back, reset, setUser } = useStore();
  const [name, setName] = useState("Clara Souza");
  const [email, setEmail] = useState("clara@email.com");
  const [phone, setPhone] = useState("(51) 98765-4321");
  const [pass, setPass] = useState("bora2023");
  const [pass2, setPass2] = useState("bora2023");
  const [show, setShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shake, setShake] = useState(0);
  const [phase, setPhase] = useState<"form" | "loading" | "done">("form");

  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  const nameOk = name.trim().length > 1;
  const passOk = pass.length >= 6;
  const match = pass2.length > 0 && pass === pass2;
  const mismatch = pass2.length > 0 && pass !== pass2;

  const submit = () => {
    setSubmitted(true);
    if (!(nameOk && emailOk && passOk && match)) {
      setShake((n) => n + 1);
      return;
    }
    setPhase("loading");
    window.setTimeout(() => setPhase("done"), 800);
    window.setTimeout(() => {
      setUser({ name: name.trim(), email: email.trim() });
      reset("tabs", "fade", "home");
    }, 1400);
  };

  return (
    <div className={css.screen}>
      <div style={{ height: "var(--status-h)" }} />
      <TopBar onBack={() => back()} />
      <form
        className={`scroll ${css.form}`}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        <Stagger className={css.fields} step={0.05}>
          <Item className={css.head}>
            <h2 className="t-display">Create your account</h2>
            <span className="t-body">It takes less than a minute.</span>
          </Item>
          <Field id="name" label="Full name" status={submitted && !nameOk ? "error" : "idle"} message={submitted && !nameOk ? errorMsg("Enter your name") : null} shake={submitted && !nameOk ? shake : 0}>
            <input id="name" className={css.input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field
            id="email"
            label="Email"
            status={submitted && !emailOk ? "error" : "idle"}
            message={submitted && !emailOk ? errorMsg("Check the email format") : null}
            shake={submitted && !emailOk ? shake : 0}
          >
            <input id="email" type="email" className={css.input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field
            id="phone"
            label="Phone"
            prefix={
              <span className={css.ddi}>
                +55
                <Icon name="angle-down" size={20} style={{ color: "var(--n500)" }} />
              </span>
            }
          >
            <input id="phone" type="tel" inputMode="tel" className={css.input} value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
          </Field>
          <Field
            id="pass"
            label="Password"
            status={submitted && !passOk ? "error" : "idle"}
            message={submitted && !passOk ? errorMsg("Use at least 6 characters") : null}
            shake={submitted && !passOk ? shake : 0}
            suffix={
              <button type="button" className={css.eye} onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
                <Icon name={show ? "eye" : "eye-slash"} size={22} />
              </button>
            }
          >
            <input id="pass" type={show ? "text" : "password"} className={css.input} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field
            id="pass2"
            label="Repeat password"
            status={match ? "valid" : mismatch ? "error" : "idle"}
            shake={mismatch ? shake : 0}
            message={
              match ? (
                <>Passwords match</>
              ) : mismatch ? (
                errorMsg("Passwords don't match")
              ) : null
            }
            suffix={
              <AnimatePresence>
                {match && (
                  <motion.span
                    key="ok"
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className={css.check}
                  >
                    <Icon name="check-circle" size={22} />
                  </motion.span>
                )}
              </AnimatePresence>
            }
          >
            <input id="pass2" type={show ? "text" : "password"} className={css.input} value={pass2} onChange={(e) => setPass2(e.target.value)} autoComplete="new-password" />
          </Field>
        </Stagger>
        <button type="submit" hidden />
      </form>
      <div className={css.footer}>
        <Button onClick={submit} disabled={phase !== "form"} className={phase !== "form" ? css.busy : undefined}>
          <AnimatePresence mode="wait" initial={false}>
            {phase === "form" && (
              <motion.span key="t" exit={{ opacity: 0, y: -8 }}>
                Sign up
              </motion.span>
            )}
            {phase === "loading" && (
              <motion.span
                key="l"
                className={css.spinner}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{ rotate: { duration: 0.8, repeat: Infinity, ease: "linear" } }}
              />
            )}
            {phase === "done" && (
              <motion.span key="d" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                <Icon name="check" size={26} />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </div>
  );
}

function errorMsg(text: string) {
  return (
    <>
      <Icon name="exclamation-circle" size={16} />
      {text}
    </>
  );
}
