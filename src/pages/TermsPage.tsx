import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FileText, Scale, Shield, AlertTriangle, CreditCard, Users, Crown, Database } from 'lucide-react';

const TermsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Scale className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-xl text-muted-foreground">
            Please read these terms carefully before using OpenAI Chat Insights.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: January 15, 2025
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Acceptance of Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please read these Terms of Service ("Terms," "Terms of Service") carefully before using the OpenAI Chat Insights web application (the "Service") operated by OpenAI Chat Insights ("us," "we," or "our").
              </p>
              <p className="text-muted-foreground mt-4">
                Your access to and use of the Service is conditioned upon your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who wish to access or use the Service.
              </p>
              <p className="text-muted-foreground mt-4">
                By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you do not have permission to access the Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                1. Description of Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                OpenAI Chat Insights provides a platform for users to upload their OpenAI conversations.json data. The Service then analyzes this data using Large Language Models (LLMs) to generate insights, summaries, and reports ("User Reports") about the user's conversational patterns, topics discussed, communication style, and other inferred characteristics based on the provided data. The Service offers both free and premium tiers of insights.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                2. Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Account Creation</h4>
                <p className="text-muted-foreground">
                  When you create an account with us, you guarantee that you are above the age of 13 (or older, if required by your jurisdiction) and that the information you provide us is accurate, complete, and current at all times. Inaccurate, incomplete, or obsolete information may result in the immediate termination of your account on the Service.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Account Responsibility</h4>
                <p className="text-muted-foreground">
                  You are responsible for maintaining the confidentiality of your account and password, including but not limited to the restriction of access to your computer and/or account. You agree to accept responsibility for any and all activities or actions that occur under your account and/or password. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Prohibited Uses</h4>
                <p className="text-muted-foreground">You may not use the Service for any unlawful purpose or to upload data that:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                  <li>You do not have the legal right to possess and process.</li>
                  <li>Contains illegal content, hate speech, or incites violence.</li>
                  <li>Infringes upon the intellectual property rights of others.</li>
                  <li>Contains viruses, malware, or other harmful code.</li>
                  <li>Attempts to disrupt or abuse the Service infrastructure.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                3. User Data and Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Your Data</h4>
                <p className="text-muted-foreground">
                  You retain full ownership of the conversations.json file you upload ("Uploaded Conversation Data") and the User Reports generated by the Service from your data.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">License to Us</h4>
                <p className="text-muted-foreground">
                  By uploading your Uploaded Conversation Data, you grant us a limited, non-exclusive, worldwide, royalty-free, revocable license to access, use, process, copy, distribute (solely within our secure processing environment), perform, display (solely to you within the Service), and create derivative works (i.e., the User Reports) from your Uploaded Conversation Data solely for the purpose of providing the Service to you and generating your User Reports. This license terminates automatically and immediately when your Uploaded Conversation Data and associated temporary processing data are deleted as described in our Privacy Policy (i.e., upon successful generation of your User Report). The license to display your final User Reports to you continues as long as you maintain your account and those reports, or until you delete them.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Responsibility for Data</h4>
                <p className="text-muted-foreground">
                  You are solely responsible for your Uploaded Conversation Data and the consequences of uploading and processing it. You represent and warrant that you have all necessary rights, licenses, and consents to upload and process your data through our Service.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Data Handling and Deletion</h4>
                <p className="text-muted-foreground">
                  Our data handling, retention, and deletion practices, particularly the automatic deletion of your raw Uploaded Conversation Data and temporary processing data after User Report generation, are detailed in our Privacy Policy, which is an integral part of these Terms. Please review it carefully.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                4. Fees and Payment (For Premium Services)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Subscription</h4>
                <p className="text-muted-foreground">
                  Some parts of the Service may be billed on a subscription basis ("Subscription(s)"). You will be billed in advance on a recurring and periodic basis (such as monthly or annually), depending on the type of Subscription plan you select.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Auto-Renewal</h4>
                <p className="text-muted-foreground">
                  At the end of each billing period, your Subscription will automatically renew under the exact same conditions unless you cancel it or we cancel it. You may cancel your Subscription renewal either through your online account management page or by contacting our customer support.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Payment Method</h4>
                <p className="text-muted-foreground">
                  A valid payment method, including credit card, is required to process the payment for your Subscription. You shall provide us or our third-party payment processor (e.g., Stripe) with accurate and complete billing information. By submitting such payment information, you automatically authorize us to charge all Subscription fees incurred through your account to any such payment instruments.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Fee Changes</h4>
                <p className="text-muted-foreground">
                  We, in our sole discretion and at any time, may modify the Subscription fees. Any Subscription fee change will become effective at the end of the then-current billing period. We will provide you with reasonable prior notice of any change in Subscription fees to give you an opportunity to terminate your Subscription before such change becomes effective. Your continued use of the Service after the Subscription fee change comes into effect constitutes your agreement to pay the modified Subscription fee amount.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Refunds</h4>
                <p className="text-muted-foreground">
                  Except when required by law, paid Subscription fees are non-refundable.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Crown className="h-5 w-5 mr-2" />
                5. Intellectual Property
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Our Service</h4>
                <p className="text-muted-foreground">
                  The Service and its original content (excluding User-Uploaded Conversation Data and User Reports), features, and functionality are and will remain the exclusive property of OpenAI Chat Insights and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Your User Reports</h4>
                <p className="text-muted-foreground">
                  As stated, you own the User Reports generated from your data.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Generated Insights</h4>
                <p className="text-muted-foreground">
                  The insights and reports generated from your data belong to you. However, we may use aggregated, anonymized insights to improve our service and AI models, provided no individual user can be identified.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                6. Disclaimers; Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">"AS IS" and "AS AVAILABLE"</h4>
                <p className="text-muted-foreground">
                  The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, express or implied, regarding the operation or availability of the Service, or the information, content, or materials included therein.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">AI-Generated Insights</h4>
                <p className="text-muted-foreground">
                  The insights provided by the Service are generated by LLMs based on the data you provide. These insights are for informational, self-reflection, and entertainment purposes only. They do not constitute, and should not be interpreted as, professional psychological, medical, financial, legal, or any other type of professional advice. You should not make significant life decisions based solely on these insights. Always consult with a qualified professional for such advice. We do not guarantee the accuracy, completeness, or usefulness of any insights.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">No Guarantee of Privacy for Revealed Information</h4>
                <p className="text-muted-foreground">
                  While our Service is designed to protect the data you upload to us as per our Privacy Policy, the insights generated may highlight or summarize information, potentially sensitive personal information or PII, that you previously included in your conversations with OpenAI's models. You acknowledge that the Service is a tool to help you understand what your chat data contains; the original act of sharing that information with OpenAI's models was your own.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Limitation of Liability</h4>
                <p className="text-muted-foreground">
                  To the maximum extent permitted by applicable law, in no event shall OpenAI Chat Insights, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service (including User Reports); and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose. Our total liability to you for all claims arising out of or relating to the Service or these Terms shall not exceed the amount paid by you, if any, for accessing or using the Service during the twelve (12) months preceding the claim.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Termination by Us</h4>
                <p className="text-muted-foreground">
                  We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Termination by You</h4>
                <p className="text-muted-foreground">
                  If you wish to terminate your account, you may do so through your account settings, which will result in the deletion of your data as described in our Privacy Policy.
                </p>
              </div>
              <p className="text-muted-foreground">
                All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Governing Law</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
              </p>
              <p className="text-muted-foreground mt-4">
                Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect. These Terms constitute the entire agreement between us regarding our Service and supersede and replace any prior agreements we might have had between us regarding the Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>
              <p className="text-muted-foreground mt-4">
                By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> legal@chatinsights.com</p>
                <p><strong>Support Email:</strong> support@chatinsights.com</p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              These Terms of Service constitute the entire agreement between you and OpenAI Chat Insights 
              regarding the use of the Service and supersede all prior agreements and understandings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;