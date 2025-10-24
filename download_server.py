#!/usr/bin/env python3
"""
Simple HTTP server to download the Spirit Tours documentation
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import sys

class DownloadHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '/download':
            # Serve the documentation page
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            
            html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Spirit Tours Documentation Download</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 50px auto;
                        padding: 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                    }
                    .container {
                        background: white;
                        border-radius: 10px;
                        padding: 40px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    }
                    h1 {
                        color: #1e3a8a;
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .download-section {
                        background: #f8f9fa;
                        border-radius: 8px;
                        padding: 30px;
                        margin: 20px 0;
                        text-align: center;
                    }
                    .download-btn {
                        display: inline-block;
                        padding: 15px 40px;
                        background: #1e3a8a;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        font-size: 18px;
                        font-weight: bold;
                        transition: all 0.3s;
                        margin: 10px;
                    }
                    .download-btn:hover {
                        background: #2c5282;
                        transform: scale(1.05);
                    }
                    .file-info {
                        margin: 20px 0;
                        padding: 15px;
                        background: #e8f4f8;
                        border-left: 4px solid #1e3a8a;
                        border-radius: 4px;
                    }
                    .success {
                        color: #10b981;
                        font-weight: bold;
                    }
                    ul {
                        text-align: left;
                        max-width: 600px;
                        margin: 20px auto;
                    }
                    li {
                        margin: 10px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🎯 Spirit Tours Platform Documentation</h1>
                    
                    <div class="file-info">
                        <h3>📄 Document Information:</h3>
                        <ul>
                            <li><strong>Advanced Documentation:</strong> Spirit_Tours_Advanced_Technical_Documentation.docx (48 KB)</li>
                            <li><strong>Basic Documentation:</strong> Spirit_Tours_Platform_Documentation.docx (46 KB)</li>
                            <li><strong>Format:</strong> Microsoft Word (.docx)</li>
                            <li><strong>Language:</strong> English</li>
                            <li><strong>Pages:</strong> 100+ pages (Advanced), 40+ pages (Basic)</li>
                            <li><strong>Version:</strong> 3.0 (Advanced), 2.0 (Basic)</li>
                        </ul>
                    </div>
                    
                    <div class="download-section">
                        <h2>📥 Download Complete System Documentation</h2>
                        <p>Click the button below to download the comprehensive documentation for Spirit Tours Platform:</p>
                        <a href="/Spirit_Tours_Advanced_Technical_Documentation.docx" class="download-btn" download>
                            ⬇️ Download Advanced Technical Documentation (NEW)
                        </a>
                        
                        <p style="margin-top: 20px;">
                            <a href="/Spirit_Tours_Platform_Documentation.docx" class="download-btn" style="background: #4b5563;">
                                📄 Download Basic Documentation
                            </a>
                        </p>
                        
                        <p style="margin-top: 20px;">
                            <a href="/SPIRIT_TOURS_COMPLETE_SYSTEM_DOCUMENTATION.md" class="download-btn" style="background: #6b7280;">
                                📝 Download Markdown Version
                            </a>
                        </p>
                    </div>
                    
                    <div style="margin-top: 30px;">
                        <h3>📋 Document Contents:</h3>
                        <ul>
                            <li>✅ Complete System Overview</li>
                            <li>✅ 21 Core Modules Documentation</li>
                            <li>✅ Group Coordination System</li>
                            <li>✅ Voucher Management System</li>
                            <li>✅ Intelligent Reminder System</li>
                            <li>✅ AI & Machine Learning Features</li>
                            <li>✅ Technical Specifications</li>
                            <li>✅ Infrastructure & Architecture</li>
                            <li>✅ Security Features</li>
                            <li>✅ Performance Optimizations</li>
                            <li>✅ Deployment Guide</li>
                            <li>✅ API Documentation</li>
                            <li>✅ Support & Contact Information</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin-top: 40px; color: #6b7280;">
                        <p class="success">✅ System 100% Complete - 400,000+ lines of production code</p>
                        <p>© 2024 Spirit Tours Platform - Enterprise Tourism Management System</p>
                    </div>
                </div>
            </body>
            </html>
            """
            self.wfile.write(html.encode())
            
        elif self.path == '/Spirit_Tours_Advanced_Technical_Documentation.docx':
            # Serve the Advanced Word document
            self.send_response(200)
            self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            self.send_header('Content-Disposition', 'attachment; filename="Spirit_Tours_Advanced_Technical_Documentation.docx"')
            
            file_path = '/home/user/webapp/Spirit_Tours_Advanced_Technical_Documentation.docx'
            file_size = os.path.getsize(file_path)
            self.send_header('Content-Length', str(file_size))
            self.end_headers()
            
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
                
        elif self.path == '/Spirit_Tours_Platform_Documentation.docx':
            # Serve the Word document
            self.send_response(200)
            self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            self.send_header('Content-Disposition', 'attachment; filename="Spirit_Tours_Platform_Documentation.docx"')
            
            file_path = '/home/user/webapp/Spirit_Tours_Platform_Documentation.docx'
            file_size = os.path.getsize(file_path)
            self.send_header('Content-Length', str(file_size))
            self.end_headers()
            
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
                
        elif self.path == '/SPIRIT_TOURS_COMPLETE_SYSTEM_DOCUMENTATION.md':
            # Serve the Markdown document
            self.send_response(200)
            self.send_header('Content-Type', 'text/markdown')
            self.send_header('Content-Disposition', 'attachment; filename="SPIRIT_TOURS_COMPLETE_SYSTEM_DOCUMENTATION.md"')
            
            file_path = '/home/user/webapp/SPIRIT_TOURS_COMPLETE_SYSTEM_DOCUMENTATION.md'
            file_size = os.path.getsize(file_path)
            self.send_header('Content-Length', str(file_size))
            self.end_headers()
            
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            super().do_GET()

def main():
    port = 8888
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, DownloadHandler)
    
    print(f"📁 Document Download Server Started!")
    print(f"🌐 Server running on port {port}")
    print(f"📥 Access the download page to get your documentation")
    print(f"🛑 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")
        sys.exit(0)

if __name__ == '__main__':
    main()