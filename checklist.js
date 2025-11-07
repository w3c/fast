document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("fieldset").forEach((fieldset) => {
    const yesRadio = fieldset.querySelector(
      'input[type="radio"][value="Yes"], input[type="radio"][value="yes"]'
    );
    const noRadio = fieldset.querySelector(
      'input[type="radio"][value="No"], input[type="radio"][value="no"]'
    );
    const detailsList = Array.from(fieldset.children).filter(
      (el) => el.tagName.toLowerCase() === "details"
    );

    if (!yesRadio || !noRadio || !detailsList.length) return;

    function updateDetails() {
      const open = !!yesRadio.checked;
      detailsList.forEach((d) => (d.open = open));
    }

    yesRadio.addEventListener("change", updateDetails);
    noRadio.addEventListener("change", updateDetails);
    updateDetails();
  });

  const createBtn =
    document.getElementById("createIssueBtn") ||
    document.querySelector('button[type="submit"]');
  if (createBtn) {
    createBtn.addEventListener("click", (ev) => {
      ev.preventDefault && ev.preventDefault();
      const specName = document.getElementById("spec-name");
      const specUrl = document.getElementById("spec-url");
      if (specName && specUrl) {
        const isValid = specName.checkValidity() && specUrl.checkValidity();
        if (!isValid) {
          specName.reportValidity() && specUrl.reportValidity();
          return;
        }
      }
      const markdown = buildMarkdown();

      navigator.clipboard
        .writeText(markdown)
        .then(() => {
          const repoUrl = document.getElementById("spec-repo")?.value.trim();
          const issueTitle = "FAST checklist";
          if (!repoUrl || !validateGitHubRepoUrl(repoUrl)) {
            alert(
              "Please enter a valid GitHub repository URL in the format 'https://github.com/<org>/<repo>'."
            );
            return;
          }
          alert("Markdown copied to clipboard!");
          const issueBody = `<!-- The markdown content has been copied to your clipboard. Please paste it here -->`;
          if (repoUrl) {
            const cleanUrl = repoUrl.replace(/\/+$/, "");
            window.location.href = `${cleanUrl}/issues/new?title=${encodeURIComponent(issueTitle)}&body= ${encodeURIComponent(issueBody)}`;
          }
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
          window.prompt("Copy the markdown below (Ctrl/Cmd+C):", markdown);
        });
    });
  }
});

function cleanText(text) {
  return text
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validateGitHubRepoUrl(repoUrl) {
  const regex = /^https:\/\/github\.com\/([^\/]+)\/([^\/\?]+)[\/\?]?/;
  return regex.test(repoUrl);
}

function htmlToMarkdownText(elem) {
  if (!elem) return "";
  const div = document.createElement("div");
  div.innerHTML = elem.innerHTML;

  div.querySelectorAll("a").forEach((a) => {
    const md = `[${a.textContent.trim()}](${a.href})`;
    a.replaceWith(md);
  });

  const raw = (div.innerText || div.textContent || "").replace(/\u00A0/g, " ");
  return cleanText(raw);
}

function buildMarkdown() {
  let markdown = "";

  document.querySelectorAll("fieldset").forEach((fieldset) => {
    if (fieldset.querySelector('input[type="text"]')) {
      return;
    }

    const legendElem = fieldset.querySelector("legend");
    if (!legendElem) return;

    const heading = htmlToMarkdownText(legendElem);
    const fieldYesChecked = !!fieldset.querySelector(
      'input[type="radio"][value="Yes"]:checked, input[type="radio"][value="yes"]:checked'
    );

    let fieldSummaryText = "Checklist";
    const fieldDetails = fieldset.querySelector("details > summary");
    if (fieldDetails) {
      fieldSummaryText = cleanText(fieldDetails.textContent);
    }

    markdown += `## ${heading}\n\n`;
    markdown += `- ${fieldYesChecked ? "[X]" : "[ ]"} ${fieldSummaryText}\n\n`;

    markdown += ` <details ${fieldYesChecked ? "open" : ""}>\n\n <summary>More details: ${fieldSummaryText}  </summary>\n\n`;

    const table = fieldset.querySelector("table");
    if (!table) {
      markdown += `  _No checklist available_\n\n</details>\n\n`;
      return;
    }

    table.querySelectorAll("tbody tr").forEach((tr) => {
      const detailsEl = tr.querySelector("th details");

      let summaryText = "Checklist item";
      if (detailsEl) {
        const summaryEl = detailsEl.querySelector("summary");
        if (summaryEl) {
          summaryText = cleanText(summaryEl.textContent);
        }
      }

      const rowYesChecked = !!(
        tr.querySelector('input[type="checkbox"]:checked') ||
        tr.querySelector('input[type="radio"][value="Yes"]:checked') ||
        tr.querySelector('input[type="radio"][value="yes"]:checked')
      );

      markdown += `  ${rowYesChecked ? "- [x]" : "- [ ]"} ${summaryText}\n\n`;

      if (detailsEl) {
        const pEl = detailsEl.querySelector("p");
        if (pEl) {
          const descText = htmlToMarkdownText(pEl);
          markdown += `     <details>\n\n     ${descText}\n\n     </details>\n\n`;
        }
      }

      const refEls = Array.from(tr.querySelectorAll("td a"));
      if (refEls.length) {
        markdown += `     <details>\n      <summary>References</summary>\n\n`;
        refEls.forEach((a) => {
          markdown += `      * [${cleanText(a.textContent)}](${a.href})\n`;
        });
        markdown += `     </details>\n\n`;
      }
    });
    markdown += `   </details>\n\n`;
  });
  return markdown;
}
