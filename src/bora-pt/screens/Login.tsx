import { useStore } from "../store";
import { Button, Icon, Item, Logo, Stagger } from "../components/ui";
import css from "./Login.module.css";

const SOCIAL = [
  { icon: "apple", label: "Continuar com Apple", color: "#101828", size: 24 },
  { icon: "google", label: "Continuar com Google", color: "#EA4335", size: 22 },
  { icon: "facebook", label: "Continuar com Facebook", color: "#1877F2", size: 24 },
];

export function Login() {
  const { reset, push } = useStore();
  const toHome = () => reset("tabs", "fade", "home");
  const toSignup = () => push("signup");

  return (
    <div className={css.screen}>
      <div className={css.brand}>
        <Logo height={(190 * 342) / 1995} layoutId="logo" />
        <Stagger delay={0.25}>
          <Item>
            <span className="t-body" style={{ textAlign: "center", display: "block" }}>
              Educação financeira gratuita e sem conflito de interesses.
            </span>
          </Item>
        </Stagger>
      </div>
      <Stagger className={css.actions} delay={0.35} step={0.07}>
        {SOCIAL.map((s) => (
          <Item key={s.icon}>
            <Button variant="outline" className={css.gridBtn} onClick={toHome}>
              <Icon name={s.icon} size={s.size} style={{ color: s.color, textAlign: "center" }} />
              <span>{s.label}</span>
            </Button>
          </Item>
        ))}
        <Item className={css.divider}>
          <span />
          ou
          <span />
        </Item>
        <Item>
          <Button className={css.gridBtn} onClick={toSignup}>
            <Icon name="envelope" size={22} style={{ textAlign: "center" }} />
            <span>Continuar com Email</span>
          </Button>
        </Item>
        <Item className={css.signup}>
          Primeira vez aqui?
          <button type="button" onClick={toSignup}>
            Cadastre-se
          </button>
        </Item>
      </Stagger>
    </div>
  );
}
