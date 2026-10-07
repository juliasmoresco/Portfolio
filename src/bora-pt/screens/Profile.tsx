import { motion } from "motion/react";
import { useState } from "react";
import { initials, useStore } from "../store";
import { Button, Icon, Item, Sheet, Stagger } from "../components/ui";
import css from "./Profile.module.css";

const SETTINGS = [
  { icon: "user", label: "Informações pessoais" },
  { icon: "envelope", label: "Email" },
  { icon: "key-skeleton", label: "Senha" },
];

const SUPPORT = [
  { icon: "comment-alt-message", label: "Envie sua dúvida" },
  { icon: "question-circle", label: "FAQ" },
  { icon: "feedback", label: "Enviar feedback" },
];

export function Profile() {
  const { user, toast, reset, restart } = useStore();
  const [confirm, setConfirm] = useState(false);
  const soon = () => toast("Esta tela está fora do escopo deste protótipo.");

  return (
    <>
      <div className={`scroll ${css.scroll}`}>
        <Stagger className={css.page} step={0.06}>
          <Item>
            <h1 className={css.h1}>Perfil</h1>
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
              Editar
            </motion.button>
          </Item>
          <Item className={css.group}>
            <span className="t-overline">Configurações do perfil</span>
            <List items={SETTINGS} onPick={soon} />
          </Item>
          <Item>
            <motion.button type="button" className={`card ${css.test}`} onClick={() => toast("Abriria o teste em uma página externa.")} whileTap={{ scale: 0.98 }}>
              <span className={css.testIcon}>
                <Icon name="clipboard-notes" size={22} />
              </span>
              <span className={css.userText}>
                <span className={css.testTitle}>Teste de perfil do investidor</span>
                <span className={css.small}>Abre em uma página externa</span>
              </span>
              <Icon name="external-link-alt" size={20} style={{ color: "var(--n600)" }} />
            </motion.button>
          </Item>
          <Item className={css.group}>
            <span className="t-overline">Suporte</span>
            <List items={SUPPORT} onPick={soon} />
          </Item>
          <Item className={css.bottom}>
            <button type="button" className={css.logout} onClick={() => setConfirm(true)}>
              <Icon name="sign-out-alt" size={20} />
              Sair da conta
            </button>
            <button type="button" className={css.restart} onClick={restart}>
              <Icon name="redo" size={16} />
              Recomeçar protótipo
            </button>
          </Item>
        </Stagger>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} label="Sair da conta">
        <div className={css.sheetText}>
          <h2 className="t-title">Tem certeza que deseja sair?</h2>
          <p className="t-body">Seu progresso na Trilha 1 fica salvo na sua conta.</p>
        </div>
        <div className={css.sheetActions}>
          <Button variant="danger" onClick={() => reset("login", "fade")}>
            Sair
          </Button>
          <Button variant="ghost" onClick={() => setConfirm(false)}>
            Cancelar
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
