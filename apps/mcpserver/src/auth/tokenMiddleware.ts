import type { IncomingMessage } from "http";

import { getLogger } from "@logtape/logtape";

import { verifyGithubUser } from "./github.js";

// Tipo AuthInfo locale compatibile con MCP SDK
export type AuthInfo = Record<string, unknown> & {
  clientId: string;
  extra: { userId: string };
  scopes: string[];
  token: string;
};

const logger = getLogger(["mcpserver", "token-middleware"]);

export const tokenMiddleware = async (
  req: IncomingMessage,
): Promise<AuthInfo | undefined> => {
  try {
    logger.debug("[tokenMiddleware] Invocato per richiesta", {
      headers: req.headers,
    });

    // Controllo header Authorization
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      logger.warn("[tokenMiddleware] Nessun header Authorization presente");
      return undefined; // Nessuna autenticazione
    }

    if (!authHeader.startsWith("Bearer ")) {
      logger.warn("[tokenMiddleware] Header Authorization format invalid");
      return undefined;
    }

    const token = authHeader.slice(7); // Rimuovi "Bearer "
    logger.debug("[tokenMiddleware] Token estratto", {
      tokenLength: token.length,
    });

    // Verifica membership GitHub
    logger.debug("[tokenMiddleware] Verifica membership GitHub");
    const isMember = await verifyGithubUser(token);
    if (!isMember) {
      logger.warn(
        "[tokenMiddleware] User non è membro delle organizzazioni richieste",
      );
      throw new Error("User is not a member of required organizations");
    }

    logger.debug("[tokenMiddleware] Membership OK, restituisco authInfo");

    // Restituisci AuthInfo per l'SDK MCP
    return {
      clientId: "mcp-client",
      extra: { userId: "github-user" },
      scopes: ["default"],
      token,
    };
  } catch (error) {
    logger.error("[tokenMiddleware] Errore dettagliato", {
      error: (error as Error).message,
      name: (error as Error).name,
      stack: (error as Error).stack,
    });
    throw error;
  }
};
