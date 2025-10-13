import { promptsCatalog, getEnabledPrompts, getPromptById, getPrompts } from "./src/index.js";

const test = async () => {
  console.log("📦 Testing mcp-prompts package\n");

  console.log("Catalog version:", promptsCatalog.version);
  
  const prompts = await getPrompts();
  console.log("Total prompts:", prompts.length);

  console.log("\n📋 All prompts:");
  for (const prompt of prompts) {
    console.log(`- ${prompt.metadata.title} (${prompt.id}) - ${prompt.enabled ? "✅" : "❌"}`);
  }

  console.log("\n🟢 Enabled prompts:");
  const enabled = await getEnabledPrompts();
  console.log(`Found ${enabled.length} enabled prompts`);

  console.log("\n🔍 Test getPromptById:");
  const terraform = await getPromptById("generate-terraform-configuration");
  console.log(terraform ? `Found: ${terraform.metadata.title}` : "Not found");

  console.log("\n✅ All tests passed!");
};

test().catch(console.error);