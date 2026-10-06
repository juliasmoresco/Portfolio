import { motion } from "motion/react";
import { useState } from "react";
import { initials, useStore } from "../store";
import { Button, Icon, Item, Sheet, Stagger } from "../components/ui";
import css from "./Profile.module.css";

const SETTINGS = [
  { icon: "user", label: "Personal info" },
  { icon: "envelope", label: "Email" },
  { icon: "key-skeleton", label: "Password" },
];

const SUPPORT = [
  { icon: "comment-alt-message", label: "Ask a question" },
  { icon: "question-circle", label: "FAQ" },
  { icon: "feedback", label: "Send feedback" },
];

export function Profile() {
  const { user, toast, reset, restart } = useStore();
  const [confirm, setConfirm] = useState(false);
  const soon = () => toast("This screen is outside the scope of this prototype.");

  return (
    <>
      <div className={`scroll ${css.scroll}`}>
        <Stagger className={css.page} step={0.06}>
          <Item>
            <h1 className={css.h1}>Profile</h1>
          </Item>
          <Item className={css.user}>
            <motion.span className={css.avatar} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.1 }}>
              {initials(user.name)}
            </motion.span>
            <span className={css.userText}>
              <span className={css.name}>{user.name}</span>
              <span className="t-meta">{user.email}</span>
            </span>
            <motion.button type="button" className={css.edit} onClick={soon} whileTap={{ scale: 0.95 }}>
              Edit
            </motion.button>
          </Item>
          <Item className={css.group}>
            <span className="t-overline">Profile settings</span>
            <List items={SETTINGS} onPick={soon} />
          </Item>
          <Item>
            <motion.button type="button" className={`card ${css.test}`} onClick={() => toast("This would open the test on an external page.")} whileTap={{ scale: 0.98 }}>
              <span className={css.testIcon}>
                <Icon name="clipboard-notes" size={22} />
              </span>
              <span className={css.userText}>
                <span className={css.testTitle}>Investor profile test</span>
                <span className={css.small}>Opens on an external page</span>
              </span>
              <Icon name="external-link-alt" size={20} style={{ color: "var(--n600)" }} />
            </motion.button>
          </Item>
          <Item className={css.group}>
            <span className="t-overline">Support</span>
            <List items={SUPPORT} onPick={soon} />
          </Item>
          <Item className={css.bottom}>
            <button type="button" className={css.logout} onClick={() => setConfirm(true)}>
              <Icon name="sign-out-alt" size={20} />
              Log out
            </button>
            <button type="button" className={css.restart} onClick={restart}>
              <Icon name="redo" size={16} />
              Restart prototype
            </button>
          </Item>
        </Stagger>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} label="Log out">
        <div className={css.sheetText}>
          <h2 className="t-title">Are you sure you want to log out?</h2>
          <p className="t-body">Your Track 1 progress stays saved in your account.</p>
        </div>
        <div className={css.sheetActions}>
          <Button variant="danger" onClick={() => reset("login", "fade")}>
            Log out
          </Button>
          <Button variant="ghost" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function List({ items, onPick }: { items: { icon: string; label: string }[]; onPick: () => void }) {
  return (
    <div className={`card ${css.list}`}>
      {items.map((it) => (
        <button key={it.label} type="button" className={css.row} onClick={onPick}>
          <Icon name={it.icon} size={20} style={{ color: "var(--n600)" }} />
          <span className={css.rowLabel}>{it.label}</span>
          <Icon name="angle-right" size={22} className={css.chev} />
        </button>
      ))}
    </div>
  );
}
