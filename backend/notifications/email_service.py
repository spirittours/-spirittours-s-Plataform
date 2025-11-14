"""
Email Notification Service
Handles all email sending operations using SendGrid with Jinja2 templating
"""

import os
import logging
from typing import Optional, List, Dict
from datetime import datetime
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from jinja2 import Template
from fastapi import HTTPException

# Configure logging
logger = logging.getLogger(__name__)

# Initialize SendGrid client
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "your_sendgrid_api_key_here")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@spirittours.com")
FROM_NAME = os.getenv("FROM_NAME", "Spirit Tours")


class EmailService:
    """Service for sending transactional emails via SendGrid"""
    
    def __init__(self):
        self.client = SendGridAPIClient(SENDGRID_API_KEY)
        self.from_email = Email(FROM_EMAIL, FROM_NAME)
    
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        plain_text: Optional[str] = None
    ) -> bool:
        """
        Send an email using SendGrid
        
        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_content: HTML email content
            plain_text: Plain text fallback (optional)
            
        Returns:
            True if email was sent successfully
        """
        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            if plain_text:
                message.plain_text_content = Content("text/plain", plain_text)
            
            response = self.client.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"✅ Email sent to {to_email}: {subject}")
                return True
            else:
                logger.error(f"❌ Failed to send email to {to_email}: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Email sending error: {str(e)}")
            return False
    
    
    async def send_welcome_email(
        self,
        to_email: str,
        full_name: str
    ) -> bool:
        """
        Send welcome email to new user
        
        Args:
            to_email: User's email address
            full_name: User's full name
            
        Returns:
            True if email was sent successfully
        """
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }
                .content {
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                }
                .button {
                    display: inline-block;
                    background: #667eea;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🌍 Welcome to Spirit Tours!</h1>
            </div>
            <div class="content">
                <h2>Hello {{ full_name }}! 👋</h2>
                <p>Thank you for joining Spirit Tours! We're thrilled to have you as part of our travel community.</p>
                <p>With Spirit Tours, you can:</p>
                <ul>
                    <li>🗺️ Discover amazing destinations worldwide</li>
                    <li>📅 Book personalized tours with ease</li>
                    <li>💰 Get exclusive deals and discounts</li>
                    <li>🤝 Connect with expert local guides</li>
                </ul>
                <p style="text-align: center;">
                    <a href="https://spirittours.com/explore" class="button">Start Exploring</a>
                </p>
                <p>If you have any questions, our support team is here to help!</p>
            </div>
            <div class="footer">
                <p>© 2024 Spirit Tours. All rights reserved.</p>
                <p>You're receiving this email because you created an account at Spirit Tours.</p>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        html_content = template.render(full_name=full_name)
        
        return await self.send_email(
            to_email=to_email,
            subject="Welcome to Spirit Tours! 🌍",
            html_content=html_content
        )
    
    
    async def send_booking_confirmation(
        self,
        to_email: str,
        booking_id: str,
        tour_name: str,
        travel_date: str,
        participants: int,
        total_amount: float,
        customer_name: str
    ) -> bool:
        """
        Send booking confirmation email
        
        Args:
            to_email: Customer email
            booking_id: Booking reference ID
            tour_name: Name of the tour
            travel_date: Date of travel
            participants: Number of participants
            total_amount: Total booking amount
            customer_name: Customer's name
            
        Returns:
            True if email was sent successfully
        """
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }
                .content {
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                }
                .booking-details {
                    background: white;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border-left: 4px solid #11998e;
                }
                .booking-details p {
                    margin: 10px 0;
                }
                .total {
                    font-size: 20px;
                    font-weight: bold;
                    color: #11998e;
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 2px solid #eee;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>✅ Booking Confirmed!</h1>
            </div>
            <div class="content">
                <h2>Hello {{ customer_name }}! 🎉</h2>
                <p>Your booking has been confirmed. Get ready for an amazing adventure!</p>
                
                <div class="booking-details">
                    <p><strong>Booking ID:</strong> {{ booking_id }}</p>
                    <p><strong>Tour:</strong> {{ tour_name }}</p>
                    <p><strong>Travel Date:</strong> {{ travel_date }}</p>
                    <p><strong>Participants:</strong> {{ participants }}</p>
                    <p class="total"><strong>Total Amount:</strong> ${{ total_amount }}</p>
                </div>
                
                <h3>What's Next?</h3>
                <ul>
                    <li>📧 Save this confirmation email</li>
                    <li>📱 Download the Spirit Tours app for updates</li>
                    <li>🎒 Check our packing guide</li>
                    <li>📞 Contact us for any questions</li>
                </ul>
                
                <p>We'll send you a reminder email 3 days before your tour.</p>
            </div>
            <div class="footer">
                <p>© 2024 Spirit Tours. All rights reserved.</p>
                <p>Need help? Contact us at support@spirittours.com</p>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        html_content = template.render(
            customer_name=customer_name,
            booking_id=booking_id,
            tour_name=tour_name,
            travel_date=travel_date,
            participants=participants,
            total_amount=total_amount
        )
        
        return await self.send_email(
            to_email=to_email,
            subject=f"Booking Confirmed - {tour_name} ✅",
            html_content=html_content
        )
    
    
    async def send_payment_receipt(
        self,
        to_email: str,
        payment_id: str,
        amount: float,
        currency: str,
        booking_id: str,
        payment_date: str,
        customer_name: str
    ) -> bool:
        """
        Send payment receipt email
        
        Args:
            to_email: Customer email
            payment_id: Payment reference ID
            amount: Payment amount
            currency: Currency code
            booking_id: Associated booking ID
            payment_date: Date of payment
            customer_name: Customer's name
            
        Returns:
            True if email was sent successfully
        """
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }
                .content {
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                }
                .receipt {
                    background: white;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border: 1px solid #ddd;
                }
                .receipt p {
                    margin: 10px 0;
                }
                .amount {
                    font-size: 24px;
                    font-weight: bold;
                    color: #667eea;
                    text-align: center;
                    padding: 20px;
                    background: #f0f0f0;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>💳 Payment Receipt</h1>
            </div>
            <div class="content">
                <h2>Hello {{ customer_name }}! 👋</h2>
                <p>Thank you for your payment. Here's your receipt:</p>
                
                <div class="amount">
                    {{ currency|upper }} ${{ amount }}
                </div>
                
                <div class="receipt">
                    <p><strong>Payment ID:</strong> {{ payment_id }}</p>
                    <p><strong>Booking ID:</strong> {{ booking_id }}</p>
                    <p><strong>Date:</strong> {{ payment_date }}</p>
                    <p><strong>Status:</strong> <span style="color: green;">✓ Paid</span></p>
                </div>
                
                <p>This receipt confirms your payment has been successfully processed.</p>
                <p>Please keep this email for your records.</p>
            </div>
            <div class="footer">
                <p>© 2024 Spirit Tours. All rights reserved.</p>
                <p>Questions? Contact us at billing@spirittours.com</p>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        html_content = template.render(
            customer_name=customer_name,
            payment_id=payment_id,
            amount=amount,
            currency=currency,
            booking_id=booking_id,
            payment_date=payment_date
        )
        
        return await self.send_email(
            to_email=to_email,
            subject=f"Payment Receipt - ${amount} {currency.upper()} 💳",
            html_content=html_content
        )
    
    
    async def send_tour_reminder(
        self,
        to_email: str,
        tour_name: str,
        travel_date: str,
        meeting_point: str,
        meeting_time: str,
        customer_name: str,
        booking_id: str
    ) -> bool:
        """
        Send tour reminder email (3 days before)
        
        Args:
            to_email: Customer email
            tour_name: Name of the tour
            travel_date: Date of travel
            meeting_point: Where to meet
            meeting_time: Time to meet
            customer_name: Customer's name
            booking_id: Booking reference
            
        Returns:
            True if email was sent successfully
        """
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }
                .content {
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                }
                .reminder-box {
                    background: white;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border-left: 4px solid #f5576c;
                }
                .checklist {
                    background: #fff9e6;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 15px 0;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>⏰ Your Tour is Coming Up!</h1>
            </div>
            <div class="content">
                <h2>Hello {{ customer_name }}! 🎒</h2>
                <p>Your tour is in <strong>3 days</strong>! Here are the details:</p>
                
                <div class="reminder-box">
                    <p><strong>📍 Tour:</strong> {{ tour_name }}</p>
                    <p><strong>📅 Date:</strong> {{ travel_date }}</p>
                    <p><strong>🕐 Time:</strong> {{ meeting_time }}</p>
                    <p><strong>📌 Meeting Point:</strong> {{ meeting_point }}</p>
                    <p><strong>🎫 Booking ID:</strong> {{ booking_id }}</p>
                </div>
                
                <h3>Pre-Tour Checklist:</h3>
                <div class="checklist">
                    <p>✓ Check weather forecast</p>
                    <p>✓ Prepare comfortable shoes</p>
                    <p>✓ Bring water and snacks</p>
                    <p>✓ Charge your camera/phone</p>
                    <p>✓ Have booking ID ready</p>
                </div>
                
                <p><strong>⏰ Please arrive 15 minutes early!</strong></p>
                <p>Need to make changes? Contact us as soon as possible.</p>
            </div>
            <div class="footer">
                <p>© 2024 Spirit Tours. All rights reserved.</p>
                <p>Questions? Call us at +1-555-SPIRIT or email support@spirittours.com</p>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        html_content = template.render(
            customer_name=customer_name,
            tour_name=tour_name,
            travel_date=travel_date,
            meeting_time=meeting_time,
            meeting_point=meeting_point,
            booking_id=booking_id
        )
        
        return await self.send_email(
            to_email=to_email,
            subject=f"Reminder: {tour_name} - 3 Days Away! ⏰",
            html_content=html_content
        )
    
    
    async def send_bulk_emails(
        self,
        recipients: List[str],
        subject: str,
        html_content: str
    ) -> Dict[str, int]:
        """
        Send bulk emails to multiple recipients
        
        Args:
            recipients: List of recipient email addresses
            subject: Email subject
            html_content: HTML email content
            
        Returns:
            Dictionary with success/failure counts
        """
        success_count = 0
        failure_count = 0
        
        for recipient in recipients:
            result = await self.send_email(recipient, subject, html_content)
            if result:
                success_count += 1
            else:
                failure_count += 1
        
        logger.info(f"📧 Bulk email sent: {success_count} succeeded, {failure_count} failed")
        
        return {
            "total": len(recipients),
            "success": success_count,
            "failed": failure_count
        }


# Singleton instance
email_service = EmailService()
