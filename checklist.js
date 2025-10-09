document.addEventListener("DOMContentLoaded", () => {
  initFieldsetDetails();
  initClipboardButton();
});

// Initialize Yes/No toggle for <details>
function initFieldsetDetails() {
  document.querySelectorAll("fieldset").forEach(fieldset => {
    const yesRadio = fieldset.querySelector('input[type="radio"][value="Yes"]');
    const noRadio = fieldset.querySelector('input[type="radio"][value="No"]');
    const details = fieldset.querySelector("details");
    if (!yesRadio || !noRadio || !details) return;

    function updateDetails() {
      details.open = yesRadio.checked;
    }
    yesRadio.addEventListener("change", updateDetails);
    noRadio.addEventListener("change", updateDetails);
    updateDetails();
  });
}

// Initialize Copy to Clipboard button
function initClipboardButton() {
  document.getElementById("createIssueBtn").addEventListener("click", (ev) => {
    ev.preventDefault && ev.preventDefault();

    const specName = document.getElementById("spec-name");
    const specUrl = document.getElementById("spec-url");

    //Validate fields
    if(specName && specUrl){
      const isValid = specName.checkValidity() && specUrl.checkValidity();
      if(!isValid){
        specName.reportValidity();
        specUrl.reportValidity();
        return;
      }
    }

    const markdown = buildMarkdown();

    navigator.clipboard
      .writeText(markdown)
      .then(() => handleClipboardSuccess(markdown))
      .catch(err => handleClipboardError(markdown, err));
  });
}

function buildMarkdown() {
  let markdown = "";

  document.querySelectorAll("fieldset").forEach(fieldset => {
    const legend = containerToMarkdown(fieldset.querySelector("legend")) || "Fieldset";
    const yesRadio = fieldset.querySelector('input[type="radio"][value="Yes"]');
    const details = fieldset.querySelector("details");
    if (!details) return;

    const isYes = yesRadio?.checked;
    const summaryText = containerToMarkdown(details.querySelector("summary")) || "";

    markdown += `### ${legend}\n\n`;
    markdown += `<details${isYes ? " open" : ""}>\n`;
    markdown += `<summary>${summaryText}</summary>\n\n`;

    const table = details.querySelector("table");
    markdown += table ? buildTableMarkdown(table) : "_No checklist available_\n";

    markdown += `\n</details>\n\n`;
  });

  return markdown;
}

// Build markdown for a table
function buildTableMarkdown(table) {
  let markdown = "";

  const headers = Array.from(table.querySelectorAll("thead th"))
    .map(th => containerToMarkdown(th))
    .join(" | ");
  const separators = Array.from(table.querySelectorAll("thead th"))
    .map(() => "---")
    .join(" | ");

  markdown += `| ${headers} |\n`;
  markdown += `| ${separators} |\n`;

  table.querySelectorAll("tbody tr").forEach(tr => {
    const cells = Array.from(tr.querySelectorAll("td, th")).map(td => formatTableCell(td));
    markdown += `| ${cells.join(" | ")} |\n`;
  });

  return markdown;
}

// Format individual table cell
function formatTableCell(td) {
  let text = "";

  if (td.classList.contains("met-column")) {
    const yesRadio = td.querySelector('input[type="radio"][value="yes"]');
    text = yesRadio?.checked ? "Yes" : "No";
  } else if (td.tagName === "TH") {
    const detailsElement = td.querySelector("details");
    if (detailsElement) {
      text = convertDetailsElement(detailsElement);
    } else {
      text = containerToMarkdown(td);
    }
  } else {
    text = containerToMarkdown(td);
  }

  return text;
}

// Convert <details> element to Markdown with links in <a>
function convertDetailsElement(detailsElement) {
  const cloned = detailsElement.cloneNode(true);
  cloned.removeAttribute("open"); // Closed by default

  // Convert all <a> tags to markdown
  cloned.querySelectorAll("a").forEach(a => {
    const mdLink = `[${a.textContent.trim()}](${a.href})`;
    a.replaceWith(mdLink);
  });

  const pElements = cloned.querySelectorAll("p");
  pElements.forEach(p => {
    const pContent = p.innerHTML.replace(/\s*\n\s*/g, " ").trim();
    p.innerHTML = `*${pContent}*`;
  });
  return cloned.outerHTML.replace(/\s*\n\s*/g, " ").trim();
}

// Convert container (text nodes + links) to markdown
function containerToMarkdown(container) {
  if (!container) return "";

  let md = "";
  container.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      md += node.textContent.trim() + " ";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === "A") {
        md += `[${node.textContent.trim()}](${node.href}) `;
      } else {
        md += containerToMarkdown(node) + " ";
      }
    }
  });

  return md.replace(/\s+/g, " ").trim();
}

// Clipboard success handler
function handleClipboardSuccess(markdown) {
  const repoUrl = document.getElementById("spec-repo")?.value.trim();
  const issueTitle = "FAST checklist";

  if (!repoUrl || !validateGitHubRepoUrl(repoUrl)) {
    alert("Please enter a valid GitHub repository URL in the format 'https://github.com/<org>/<repo>'.");
    return;
  }

  alert("Markdown copied to clipboard!");
  const issueBody = `<!-- The markdown content has been copied to your clipboard. Please paste it here -->`;
  const cleanUrl = repoUrl.replace(/\/+$/, "");
  window.location.href = `${cleanUrl}/issues/new?title=${encodeURIComponent(issueTitle)}&body= ${encodeURIComponent(issueBody)}`;
}

// Clipboard error handler
function handleClipboardError(markdown, err) {
  console.error("Failed to copy:", err);
  window.prompt("Copy the markdown below (Ctrl/Cmd+C):", markdown);
}

// Validate GitHub repo URL
function validateGitHubRepoUrl(repoUrl) {
  const regex = /^https:\/\/github\.com\/([^\/]+)\/([^\/\?]+)[\/\?]?/;
  return regex.test(repoUrl);
}