#!/bin/bash
# ============================================================================
# Python Environment Setup Script for simple-llm-service
# ============================================================================
# This script creates and configures the Python virtual environment for 
# local development. Run this once after cloning, or when requirements change.
#
# Usage:
#   ./setup_python.sh          # Create venv and install dependencies
#   source ./setup_python.sh   # Also activate the venv in current shell
# ============================================================================

set -e

# Get the absolute path of the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_ROOT/.venv"
PYTHON_SERVICE_DIR="$PROJECT_ROOT/python_service"
REQUIREMENTS_FILE="$PYTHON_SERVICE_DIR/requirements.txt"

echo "🐍 Setting up Python environment for simple-llm-service..."
echo "   Project root: $PROJECT_ROOT"

# ============================================================================
# Step 1: Create virtual environment if it doesn't exist
# ============================================================================
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating virtual environment at .venv..."
    python3 -m venv "$VENV_DIR"
    echo "   ✅ Virtual environment created"
else
    echo "📦 Virtual environment already exists at .venv"
fi

# ============================================================================
# Step 2: Activate the virtual environment
# ============================================================================
echo "🔌 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# ============================================================================
# Step 3: Upgrade pip
# ============================================================================
echo "⬆️  Upgrading pip..."
pip install --upgrade pip --quiet

# ============================================================================
# Step 4: Install requirements
# ============================================================================
if [ -f "$REQUIREMENTS_FILE" ]; then
    echo "📥 Installing dependencies from requirements.txt..."
    pip install -r "$REQUIREMENTS_FILE"
    echo "   ✅ Dependencies installed"
else
    echo "⚠️  Warning: requirements.txt not found at $REQUIREMENTS_FILE"
fi

# ============================================================================
# Step 5: Set PYTHONPATH
# ============================================================================
export PYTHONPATH="$PYTHON_SERVICE_DIR:$PYTHONPATH"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Python environment setup complete!"
echo ""
echo "📍 To activate manually in a new terminal:"
echo "   source $VENV_DIR/bin/activate"
echo "   export PYTHONPATH=$PYTHON_SERVICE_DIR:\$PYTHONPATH"
echo ""
echo "📍 To run the Python service:"
echo "   python python_service/main.py"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
