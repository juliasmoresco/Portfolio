import { useStore } from "../store";
import { Button, Icon, Item, Logo, Stagger } from "../components/ui";
import css from "./Login.module.css";

const SOCIAL = [
  { icon: "apple", label: "Continue with Apple", color: "#101828", size: 24 },
  { icon: "google", label: "Continue with Google", color: "#EA4335", size: 22 },
  { icon: "facebook", label: "Continue with Facebook", color: "#1877F2", size: 24 },
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
              Free financial education with no conflicts of interest.
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
          or
          <span />
        </Item>
        <Item>
          <Button className={css.gridBtn} onClick={toSignup}>
            <Icon name="envelope" size={22} style={{ textAlign: "center" }} />
            <span>Continue with email</span>
          </Button>
        </Item>
        <Item className={css.signup}>
          New here?
          <button type="button" onClick={toSignup}>
            Sign up
          </button>
        </Item>
      </Stagger>
    </div>
  );
}
