import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, Lock, Eye, Trash2, FileText, Users, Clock, Database } from 'lucide-react';

const PrivacyPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl text-muted-foreground">
            Your privacy is our priority. Learn how we protect and handle your data.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: January 15, 2025
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to OpenAI Chat Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Welcome to OpenAI Chat Insights ("we," "us," "our"). We are committed to protecting your privacy and handling your data with transparency and care. This Privacy Policy explains how we collect, use, process, and protect your information when you use our web application (the "Service").
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                1. Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Account Information</h4>
                <p className="text-muted-foreground">
                  When you create an account, we collect your email address and an encrypted password. We may also ask for a display name. This information is necessary to provide and secure your access to the Service and for communication purposes.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Uploaded Conversation Data</h4>
                <p className="text-muted-foreground">
                  To use our Service, you voluntarily upload your OpenAI conversations.json file. This file contains your conversation history with OpenAI's models.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Generated Insights & Reports</h4>
                <p className="text-muted-foreground">
                  The Service processes your Uploaded Conversation Data to generate insights and reports ("User Reports"). These User Reports are stored and associated with your account.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Usage Information</h4>
                <p className="text-muted-foreground">
                  We may collect anonymized information about how you interact with our Service, such as features used, session duration, and general usage patterns. This helps us improve the Service but is not tied to your personal identity in a way that reveals your conversation content.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Payment Information</h4>
                <p className="text-muted-foreground">
                  If you subscribe to premium features, our third-party payment processor (e.g., Stripe) will collect and process your payment information. We do not store your full credit card details on our servers. We may store transaction IDs or subscription status.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                2. How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">To Provide and Personalize the Service</h4>
                <p className="text-muted-foreground">
                  Your Uploaded Conversation Data is used exclusively to analyze your conversational patterns and generate the personalized User Reports that you request. Your Account Information is used to manage your account, authenticate you, and allow you to access your User Reports.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">To Improve the Service</h4>
                <p className="text-muted-foreground">
                  We may use aggregated and anonymized Usage Information (which does not include your personal conversation content or PII from it) to understand service trends, improve our AI models' general capabilities (without training on your specific raw data), and enhance user experience.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">To Communicate With You</h4>
                <p className="text-muted-foreground">
                  We may use your email address to send you important service-related notifications (e.g., analysis completion, account security, updates to this Policy or our Terms of Service) and, if you opt-in, occasional marketing communications about new features or offers. You can opt-out of marketing communications at any time.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">To Process Payments</h4>
                <p className="text-muted-foreground">
                  For premium services, your information is used to facilitate payment transactions via our third-party payment processor.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trash2 className="h-5 w-5 mr-2" />
                3. Data Processing, Retention, and Deletion – OUR COMMITMENT TO YOUR PRIVACY
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground font-medium">
                This section details our core data handling and deletion practices, designed to minimize data retention and maximize your privacy.
              </p>
              
              <div>
                <h4 className="font-semibold mb-2">Initial Upload and Temporary Processing</h4>
                <p className="text-muted-foreground">
                  Your conversations.json file is uploaded directly to secure, private cloud storage associated with your user identity and a specific processing job. Our automated Coordinator function streams this file. As each individual conversation is parsed, it is sent to a message queue for processing. Our automated Worker functions retrieve individual conversations from the queue, use Large Language Models (LLMs) to perform initial analysis, and store these per-conversation insights in a temporary, secure database (temp_conversation_insights), strictly segregated and linked only to your processing job.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Aggregation and Final Report Generation</h4>
                <p className="text-muted-foreground">
                  Once all individual conversations from your conversations.json file have been processed by the Worker functions, our automated Aggregator function retrieves all associated temp_conversation_insights. The Aggregator performs further analysis and uses LLMs to compile your final, comprehensive User Report (containing both free and any applicable paid insights). This User Report is then stored in our primary database, linked to your user account.
                </p>
              </div>

              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <h4 className="font-semibold mb-2 text-primary">AUTOMATIC DELETION OF RAW AND TEMPORARY DATA</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    <strong>CRITICAL:</strong> Immediately upon the successful generation and storage of your final User Report, the original conversations.json file you uploaded is PERMANENTLY DELETED from our cloud storage.
                  </p>
                  <p className="text-muted-foreground">
                    Simultaneously, all temp_conversation_insights (the intermediate, per-conversation analytical data) related to that processing job are PERMANENTLY DELETED from our temporary database.
                  </p>
                  <p className="text-muted-foreground">
                    This entire deletion process for raw and temporary data is automated and typically completes within minutes to a few hours of your upload, depending on the size of your file and system load. We do not retain your raw conversation data or temporary processing data beyond this point.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Retention of Final User Reports</h4>
                <p className="text-muted-foreground">
                  We retain your final User Reports (the aggregated insights) associated with your account so you can access them. You have full control to delete individual User Reports or your entire account (which includes all associated User Reports) at any time through your account settings.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Account Deletion</h4>
                <p className="text-muted-foreground">
                  If you choose to delete your account, all your Account Information and all associated User Reports will be permanently deleted from our systems in accordance with our data deletion timelines (typically within a short period, e.g., 7-30 days to ensure against accidental deletion, unless legally required to retain for longer). This action is irreversible.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Data Portability</h4>
                <p className="text-muted-foreground">
                  You can typically download your generated User Reports in a common format (e.g., JSON, PDF) from the Service.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                4. Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We implement robust technical and organizational measures to protect your information, including:
              </p>
              <div>
                <h4 className="font-semibold mb-2">Encryption</h4>
                <p className="text-muted-foreground">
                  Data is encrypted in transit (e.g., using TLS/SSL) and at rest (e.g., using AES-256 or similar standards provided by our cloud infrastructure partners).
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Access Controls</h4>
                <p className="text-muted-foreground">
                  Access to your data is strictly limited to authorized personnel and automated systems necessary for providing the Service. Our backend functions operate in secure, isolated environments.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Secure Infrastructure</h4>
                <p className="text-muted-foreground">
                  We leverage reputable cloud service providers (e.g., Firebase/Supabase, Google Cloud/AWS) that maintain high security standards for their infrastructure.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Regular Reviews</h4>
                <p className="text-muted-foreground">
                  We periodically review our security practices.
                </p>
              </div>
              <p className="text-muted-foreground text-sm italic">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee its absolute security.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                5. Third-Party Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We utilize the following categories of third-party services to provide and improve our Service:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Cloud Hosting & Backend Services:</strong> (e.g., Firebase, Supabase, Google Cloud, AWS) for data storage, database management, and serverless functions.</li>
                <li><strong>Large Language Model (LLM) APIs:</strong> (e.g., OpenAI, Google, Cohere, Anthropic) for the core analysis of conversation data. These services process data sent to them as per their own terms and privacy policies, but we only send the necessary conversational snippets for analysis.</li>
                <li><strong>Payment Processors:</strong> (e.g., Stripe) to handle payments for premium services securely.</li>
                <li><strong>Analytics Services (Optional & Anonymized):</strong> We may use services for anonymized website/app usage analytics to improve user experience.</li>
              </ul>
              <p className="text-muted-foreground">
                We select third-party services that have strong privacy and security commitments. However, their use of your information is governed by their respective privacy policies.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                6. Data Sharing and Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">No Sale of Personal Data</h4>
                <p className="text-muted-foreground">
                  We will never sell, rent, or trade your personal information or your Uploaded Conversation Data or User Reports to third parties for their marketing purposes.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">With Service Providers</h4>
                <p className="text-muted-foreground">
                  We may share information with trusted third-party service providers who assist us in operating our Service (as listed above), under strict confidentiality agreements and only to the extent necessary for them to perform their services for us.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">For Legal Reasons</h4>
                <p className="text-muted-foreground">
                  We may disclose your information if required to do so by law or in the good faith belief that such action is necessary to: (a) comply with a legal obligation or lawful request from government authorities; (b) protect and defend our rights or property; (c) prevent or investigate possible wrongdoing in connection with the Service; (d) protect the personal safety of users of the Service or the public; or (e) protect against legal liability. We will attempt to notify you of such disclosures unless prohibited by law.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Business Transfers</h4>
                <p className="text-muted-foreground">
                  In the event of a merger, acquisition, reorganization, bankruptcy, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify you via email and/or a prominent notice on our Service of any change in ownership or uses of your personal information, as well as any choices you may have regarding your personal information.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                7. Your Rights and Choices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Subject to applicable law, you have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Access:</strong> You can access most of your Account Information and your User Reports through your account settings.</li>
                <li><strong>Rectification:</strong> You can update or correct inaccuracies in your Account Information through your account settings.</li>
                <li><strong>Deletion:</strong> You can delete individual User Reports or your entire account (which includes all Account Information and User Reports) through your account settings.</li>
                <li><strong>Data Portability:</strong> You can typically download your User Reports.</li>
                <li><strong>Opt-out of Marketing Communications:</strong> You can unsubscribe from our marketing emails by following the instructions in those emails or through your account settings.</li>
                <li><strong>Object to Processing (Limited):</strong> Given the nature of our Service (providing insights from data you upload), objecting to the core processing would mean you cannot use the Service. However, you control what you upload and can delete your data.</li>
              </ul>
              <p className="text-muted-foreground">
                To exercise these rights, please use your account settings or contact us at privacy@chatinsights.com.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Our Service is not directed to individuals under the age of 13 (or a higher age threshold as required by applicable law). We do not knowingly collect personal information from children. If we become aware that we have inadvertently collected personal information from a child, we will take steps to delete such information promptly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your information may be transferred to — and maintained on — computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those in your jurisdiction. If you are located outside the United States and choose to provide information to us, please note that we transfer the data, including personal information, to the United States (or other jurisdictions where our cloud providers operate) and process it there. Your consent to this Privacy Policy followed by your submission of such information represents your agreement to that transfer.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                10. Changes to This Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on our Service and updating the "Last Updated" date. We may also notify you via email or other direct communication. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page. Your continued use of the Service after any modification to this Privacy Policy will constitute your acceptance of such modification.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions, concerns, or complaints about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> privacy@chatinsights.com</p>
                <p><strong>Response Time:</strong> We will endeavor to respond to your inquiry in a timely manner.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;