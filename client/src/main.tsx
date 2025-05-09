import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Web3Provider } from "./context/web3-context";
import { SaccoProvider } from "./context/sacco-context";

createRoot(document.getElementById("root")!).render(
  <Web3Provider>
    <SaccoProvider>
      <App />
    </SaccoProvider>
  </Web3Provider>
);
