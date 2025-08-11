export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-sm text-gray-600 mb-6">
            <strong>Last updated:</strong> {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Overview
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Prompt Enhancer (&quot;we&quot;, &quot;our&quot;, or
              &quot;us&quot;) is committed to protecting your privacy. This
              Privacy Policy explains how our Chrome extension handles your
              information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Information We Collect
            </h2>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Information You Provide
            </h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>
                API keys for OpenAI and Anthropic services (encrypted and stored
                locally)
              </li>
              <li>Extension preferences and settings</li>
              <li>Text prompts you choose to enhance</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Information Automatically Collected
            </h3>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Extension usage statistics (stored locally)</li>
              <li>Error logs for debugging purposes (stored locally)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 text-gray-700">
              <li>To enhance your prompts using AI services</li>
              <li>To store your preferences and settings</li>
              <li>To provide prompt enhancement history</li>
              <li>To improve the extension&apos;s functionality</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Data Storage and Security
            </h2>
            <ul className="list-disc pl-6 text-gray-700">
              <li>
                <strong>Local Storage:</strong> All data is stored locally on
                your device using Chrome&apos;s secure storage system
              </li>
              <li>
                <strong>Encryption:</strong> API keys are encrypted using
                AES-256 encryption before storage
              </li>
              <li>
                <strong>No Cloud Storage:</strong> We do not store your data on
                our servers
              </li>
              <li>
                <strong>Sync:</strong> Data may sync across your Chrome browsers
                when signed into Chrome
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Third-Party Services
            </h2>
            <p className="text-gray-700 mb-4">
              When you use the extension, your prompts may be sent to:
            </p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>
                <strong>OpenAI:</strong> When using GPT models (subject to
                OpenAI&apos;s privacy policy)
              </li>
              <li>
                <strong>Anthropic:</strong> When using Claude models (subject to
                Anthropic&apos;s privacy policy)
              </li>
            </ul>
            <p className="text-gray-700 mt-4">
              These services operate under their own privacy policies. We
              recommend reviewing their policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Data Sharing
            </h2>
            <p className="text-gray-700">
              We do not sell, trade, or share your personal information with
              third parties, except:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mt-2">
              <li>When you explicitly choose to send prompts to AI services</li>
              <li>When required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Your Rights
            </h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>
                Access your stored data through the extension&apos;s options
                page
              </li>
              <li>Delete your data by uninstalling the extension</li>
              <li>Modify your settings and preferences at any time</li>
              <li>Export your prompt history</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Children&apos;s Privacy
            </h2>
            <p className="text-gray-700">
              Our extension is not intended for children under 13. We do not
              knowingly collect personal information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Changes to This Policy
            </h2>
            <p className="text-gray-700">
              We may update this privacy policy from time to time. We will
              notify users of any significant changes through the extension or
              our website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Contact Us
            </h2>
            <p className="text-gray-700">
              If you have questions about this privacy policy, please contact us
              at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">
                <strong>Email:</strong> your-email@example.com
                <br />
                <strong>GitHub:</strong>{" "}
                https://github.com/your-username/prompt-enhancer
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Data Retention
            </h2>
            <ul className="list-disc pl-6 text-gray-700">
              <li>
                Prompt history: Stored until manually deleted or extension is
                uninstalled
              </li>
              <li>
                API keys: Stored until manually removed or extension is
                uninstalled
              </li>
              <li>
                Settings: Stored until manually reset or extension is
                uninstalled
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Compliance
            </h2>
            <p className="text-gray-700">This extension complies with:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Chrome Web Store Developer Program Policies</li>
              <li>General Data Protection Regulation (GDPR) principles</li>
              <li>California Consumer Privacy Act (CCPA) principles</li>
            </ul>
          </section>

          <div className="mt-12 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Privacy-First Approach
            </h3>
            <p className="text-green-700">
              <strong>No Data Collection:</strong> We don&apos;t collect, store,
              or transmit your personal data to our servers. Everything stays on
              your device, encrypted and secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
