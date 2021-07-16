import "focus-visible/dist/focus-visible";
import React from "react";
import ReactDOM from "react-dom";
import "tslib";
import { App } from "./app";
import { AppProviders } from "./providers";

const root = document.getElementById("app-root");

ReactDOM.render(
  <AppProviders>
    <App />
  </AppProviders>,
  root
);
